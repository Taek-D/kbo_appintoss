import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PushProvider, TossPushResponse } from '@/types/push'
import type { StateTransition } from '@/types/crawler'

/**
 * NotificationService 단위 테스트
 * Phase 03-02: 구독자 조회, 순차 발송(100ms 간격), 429 재시도,
 *              push_logs 기록, Promise.allSettled 동시 경기 처리, is_notified 플래그 업데이트 검증
 *
 * vi.hoisted() 패턴 — Phase 2/03-01에서 확립된 vitest 호이스팅 이슈 해결 패턴 적용
 */

// --- vi.hoisted: vi.mock 팩토리보다 먼저 초기화되는 변수 ---
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockEq,
  mockIn,
  mockSingle,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockIn = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockFrom = vi.fn()

  return { mockFrom, mockSelect, mockInsert, mockUpdate, mockEq, mockIn, mockSingle }
})

// --- Supabase mock ---
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}))

// --- logger mock ---
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// --- NotificationService import (모킹 설정 후) ---
import { sendGameEndNotifications } from '../notification-service'

// --- PushProvider mock ---
const mockPushProvider: PushProvider = {
  send: vi.fn(),
}

// --- 테스트 데이터 헬퍼 ---
function makeTransition(
  overrides: Partial<StateTransition> = {}
): StateTransition {
  return {
    gameId: 'game-uuid-001',
    kboGameId: 'kbo-001',
    fromStatus: 'playing',
    toStatus: 'finished',
    game: {
      kboGameId: 'kbo-001',
      gameDate: '2026-04-05',
      homeTeam: 'LG',
      awayTeam: 'KT',
      status: 'finished',
      homeScore: 3,
      awayScore: 2,
      currentInning: 9,
      startTime: '14:00',
    },
    ...overrides,
  }
}

function makeUser(id: string, tossKey: string) {
  return { id, toss_user_key: tossKey }
}

// --- Supabase chain helper ---
// users 조회 체인: from('users').select(...).in(...) -> { data, error }
function setupUsersQuery(users: Array<{ id: string; toss_user_key: string }>) {
  const chainEnd = { data: users, error: null }
  mockIn.mockResolvedValueOnce(chainEnd)
  mockSelect.mockReturnValueOnce({ in: mockIn })
  mockFrom.mockReturnValueOnce({ select: mockSelect })
}

// push_logs 삽입 체인: from('push_logs').insert(...) -> { error }
function setupLogsInsert(error: null | { message: string } = null) {
  mockInsert.mockResolvedValueOnce({ error })
  mockFrom.mockReturnValueOnce({ insert: mockInsert })
}

// games 업데이트 체인: from('games').update(...).eq(...) -> { error }
function setupGamesUpdate(error: null | { message: string } = null) {
  mockEq.mockResolvedValueOnce({ error })
  mockUpdate.mockReturnValueOnce({ eq: mockEq })
  mockFrom.mockReturnValueOnce({ update: mockUpdate })
}

// --- 테스트 스위트 ---

describe('sendGameEndNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    ;(mockPushProvider.send as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    } satisfies TossPushResponse)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Test 1: homeTeam 구독자 조회
  it('Test 1: transition.game.homeTeam="LG"일 때 team_code in ["LG","KT"]로 구독자를 조회한다', async () => {
    const transition = makeTransition({ game: { ...makeTransition().game, homeTeam: 'LG', awayTeam: 'KT' } })
    setupUsersQuery([])
    setupGamesUpdate()

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockIn).toHaveBeenCalledWith('team_code', ['LG', 'KT'])
  })

  // Test 2: 홈팀 + 원정팀 구독자 합산
  it('Test 2: 홈팀(LG)과 원정팀(KT) 구독자 모두 조회하여 합산한다', async () => {
    const users = [
      makeUser('user-1', 'toss-key-1'),
      makeUser('user-2', 'toss-key-2'),
    ]
    const transition = makeTransition()
    setupUsersQuery(users)
    setupLogsInsert()
    setupLogsInsert()
    setupGamesUpdate()

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockPushProvider.send).toHaveBeenCalledTimes(2)
    expect(mockPushProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 'toss-key-1' })
    )
    expect(mockPushProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 'toss-key-2' })
    )
  })

  // Test 3: 구독자 0명이면 발송 건너뜀
  it('Test 3: 구독자가 0명이면 pushProvider.send()를 호출하지 않고 빈 결과를 반환한다', async () => {
    const transition = makeTransition()
    setupUsersQuery([])
    setupGamesUpdate()

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockPushProvider.send).not.toHaveBeenCalled()
  })

  // Test 4: 3명 구독자 순차 발송 + 100ms 간격 검증
  it('Test 4: 3명 구독자 순차 발송 시 send()가 3번 호출되고 각 호출 사이 100ms 이상 간격이 존재한다', async () => {
    const users = [
      makeUser('u1', 'key-1'),
      makeUser('u2', 'key-2'),
      makeUser('u3', 'key-3'),
    ]
    const transition = makeTransition()
    setupUsersQuery(users)
    setupLogsInsert()
    setupLogsInsert()
    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    const callTimes: number[] = []
    sendMock.mockImplementation(() => {
      callTimes.push(Date.now())
      return Promise.resolve({ success: true })
    })

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(sendMock).toHaveBeenCalledTimes(3)
    // 각 호출 사이에 최소 100ms 간격
    for (let i = 1; i < callTimes.length; i++) {
      expect(callTimes[i] - callTimes[i - 1]).toBeGreaterThanOrEqual(100)
    }
  })

  // Test 5: 429 응답 시 1초 대기 후 1회 재시도
  it('Test 5: 429 응답 시 1초 대기 후 해당 유저에 대해 1회 재시도한다', async () => {
    const users = [makeUser('u1', 'key-1')]
    const transition = makeTransition()
    setupUsersQuery(users)
    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    sendMock
      .mockResolvedValueOnce({ success: false, errorCode: '429', errorMessage: 'Rate limited' })
      .mockResolvedValueOnce({ success: true })

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  // Test 6: 재시도도 실패 -> push_logs에 'rate_limited' 기록 + 다음 유저로 진행
  it('Test 6: 재시도도 실패하면 push_logs에 "rate_limited"로 기록 후 다음 유저로 진행한다', async () => {
    const users = [makeUser('u1', 'key-1'), makeUser('u2', 'key-2')]
    const transition = makeTransition()
    setupUsersQuery(users)
    setupLogsInsert()
    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    sendMock
      .mockResolvedValueOnce({ success: false, errorCode: '429', errorMessage: 'Rate limited' })
      .mockResolvedValueOnce({ success: false, errorCode: '429', errorMessage: 'Rate limited again' })
      .mockResolvedValueOnce({ success: true })

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    // u2는 성공적으로 발송
    expect(sendMock).toHaveBeenCalledTimes(3)
    // rate_limited 기록 확인
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rate_limited' })
    )
  })

  // Test 7: 개별 유저 발송 실패 -> push_logs status='failed' + 다음 유저 계속
  it('Test 7: 발송 실패(401) 시 push_logs에 status="failed" 기록 후 다음 유저로 계속 진행한다', async () => {
    const users = [makeUser('u1', 'key-1'), makeUser('u2', 'key-2')]
    const transition = makeTransition()
    setupUsersQuery(users)
    setupLogsInsert()
    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    sendMock
      .mockResolvedValueOnce({ success: false, errorCode: '401', errorMessage: 'Unauthorized' })
      .mockResolvedValueOnce({ success: true })

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error_message: 'Unauthorized' })
    )
  })

  // Test 8: 발송 성공 -> push_logs status='sent' 기록
  it('Test 8: 발송 성공 시 push_logs에 status="sent"를 기록한다', async () => {
    const users = [makeUser('u1', 'key-1')]
    const transition = makeTransition()
    setupUsersQuery(users)
    setupLogsInsert()
    setupGamesUpdate()

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        game_id: 'game-uuid-001',
        status: 'sent',
      })
    )
  })

  // Test 9: 2개 StateTransition -> Promise.allSettled로 병렬 처리
  it('Test 9: 2개의 StateTransition(finished, cancelled)을 전달하면 Promise.allSettled로 병렬 처리되어 둘 다 완료된다', async () => {
    const t1 = makeTransition({ gameId: 'game-001', toStatus: 'finished' })
    const t2 = makeTransition({ gameId: 'game-002', toStatus: 'cancelled' })

    // t1: users 조회 -> 1명
    setupUsersQuery([makeUser('u1', 'key-1')])
    setupLogsInsert()
    setupGamesUpdate()

    // t2: users 조회 -> 1명
    setupUsersQuery([makeUser('u2', 'key-2')])
    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    sendMock.mockResolvedValue({ success: true })

    const promise = sendGameEndNotifications([t1, t2], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  // Test 10: 한 경기 발송 실패해도 다른 경기 정상 완료
  it('Test 10: 한 경기 발송이 실패해도 다른 경기 발송은 정상 완료된다', async () => {
    const t1 = makeTransition({ gameId: 'game-001', toStatus: 'finished' })
    const t2 = makeTransition({ gameId: 'game-002', toStatus: 'finished' })

    // t1: 에러 발생 (from('users') throws)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockRejectedValueOnce(new Error('DB error')),
      }),
    })

    // t2: 정상 흐름
    setupUsersQuery([makeUser('u2', 'key-2')])
    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    sendMock.mockResolvedValue({ success: true })

    const promise = sendGameEndNotifications([t1, t2], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    // t2의 발송은 정상 완료
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 'key-2' })
    )
  })

  // Test 11: toStatus='finished' -> is_notified_finish=true 업데이트
  it('Test 11: toStatus="finished" 발송 완료 후 games 테이블의 is_notified_finish가 true로 업데이트된다', async () => {
    const transition = makeTransition({ gameId: 'game-uuid-001', toStatus: 'finished' })
    setupUsersQuery([makeUser('u1', 'key-1')])
    setupLogsInsert()
    setupGamesUpdate()

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockFrom).toHaveBeenCalledWith('games')
    expect(mockUpdate).toHaveBeenCalledWith({ is_notified_finish: true })
    expect(mockEq).toHaveBeenCalledWith('id', 'game-uuid-001')
  })

  // Test 12: toStatus='cancelled' -> is_notified_cancel=true 업데이트
  it('Test 12: toStatus="cancelled" 발송 완료 후 games 테이블의 is_notified_cancel이 true로 업데이트된다', async () => {
    const transition = makeTransition({ gameId: 'game-uuid-002', toStatus: 'cancelled' })

    // users 조회
    const chainEnd = { data: [makeUser('u1', 'key-1')], error: null }
    mockIn.mockResolvedValueOnce(chainEnd)
    mockSelect.mockReturnValueOnce({ in: mockIn })
    mockFrom.mockReturnValueOnce({ select: mockSelect })

    setupLogsInsert()
    setupGamesUpdate()

    const sendMock = mockPushProvider.send as ReturnType<typeof vi.fn>
    sendMock.mockResolvedValue({ success: true })

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockUpdate).toHaveBeenCalledWith({ is_notified_cancel: true })
    expect(mockEq).toHaveBeenCalledWith('id', 'game-uuid-002')
  })

  // Test 13: finished 전이 시 templateArgs에 팀 이름 + deepLink에 /game/{gameId}
  it('Test 13: finished 전이 시 templateArgs에 팀 이름이 포함되고 deepLink에 /game/{gameId}가 포함된다', async () => {
    const transition = makeTransition({ gameId: 'game-uuid-001', toStatus: 'finished' })
    setupUsersQuery([makeUser('u1', 'key-1')])
    setupLogsInsert()
    setupGamesUpdate()

    const promise = sendGameEndNotifications([transition], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockPushProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        deepLink: '/game/game-uuid-001',
        templateArgs: expect.objectContaining({
          homeTeam: expect.any(String),
          awayTeam: expect.any(String),
        }),
      })
    )
  })

  // Test 14: 전이 필터링 - 'playing', 'scheduled'는 무시
  it('Test 14: toStatus가 "playing"이나 "scheduled"인 전이는 무시하고 발송하지 않는다', async () => {
    const t1 = makeTransition({ toStatus: 'playing' })
    const t2 = makeTransition({ toStatus: 'scheduled' })

    const promise = sendGameEndNotifications([t1, t2], mockPushProvider)
    await vi.runAllTimersAsync()
    await promise

    expect(mockPushProvider.send).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
