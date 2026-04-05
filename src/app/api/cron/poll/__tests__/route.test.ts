import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StateTransition } from '@/types/crawler'

// --- vi.hoisted: vi.mock 팩토리보다 먼저 초기화되는 변수 ---
const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn().mockResolvedValue(undefined),
}))

// --- 모킹 설정 ---

vi.mock('@upstash/qstash', () => {
  return {
    Receiver: vi.fn().mockImplementation(function (
      this: { verify: typeof mockVerify }
    ) {
      this.verify = mockVerify
    }),
  }
})

vi.mock('@/backend/modules/crawler', () => ({
  fetchTodayGames: vi.fn(),
  syncGames: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// 모킹된 모듈 import
import { fetchTodayGames, syncGames } from '@/backend/modules/crawler'
import { logger } from '@/lib/logger'
import { POST } from '../route'

// --- 헬퍼 함수 ---

function createMockRequest(options?: { signature?: string; body?: string }): Request {
  const headers = new Headers()
  if (options?.signature !== undefined) {
    headers.set('Upstash-Signature', options.signature)
  }
  return new Request('https://app.vercel.app/api/cron/poll', {
    method: 'POST',
    headers,
    body: options?.body ?? '',
  })
}

// --- 테스트 데이터 ---

const mockGames = [
  {
    kboGameId: 'game-001',
    gameDate: '2026-04-05',
    homeTeam: 'LG',
    awayTeam: 'KT',
    status: 'playing' as const,
    homeScore: 2,
    awayScore: 1,
    currentInning: 5,
    startTime: '14:00',
  },
]

const mockTransitions: StateTransition[] = [
  {
    gameId: 'uuid-001',
    kboGameId: 'game-001',
    fromStatus: 'scheduled',
    toStatus: 'playing',
    game: mockGames[0],
  },
]

// --- 테스트 스위트 ---

describe('POST /api/cron/poll', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 기본값: 서명 검증 성공
    mockVerify.mockResolvedValue(undefined)

    // 경기 시간대(UTC 07:00 = KST 16:00) 설정
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-05T07:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Test 1: 유효한 QStash 서명 + 경기 시간대 + 크롤링 성공 + 상태 전이 있음 -> 200 OK + syncGames 호출', async () => {
    ;(fetchTodayGames as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      games: mockGames,
    })
    ;(syncGames as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransitions)

    const req = createMockRequest({ signature: 'valid-signature', body: '' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(fetchTodayGames).toHaveBeenCalledOnce()
    expect(syncGames).toHaveBeenCalledWith(mockGames)
  })

  it('Test 2: Upstash-Signature 헤더가 없으면 401 Unauthorized', async () => {
    const req = createMockRequest() // 서명 없음

    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(fetchTodayGames).not.toHaveBeenCalled()
  })

  it('Test 3: QStash 서명 검증 실패(Receiver.verify throws) -> 401 Invalid signature', async () => {
    mockVerify.mockRejectedValue(new Error('Invalid signature'))

    const req = createMockRequest({ signature: 'invalid-signature', body: '' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(fetchTodayGames).not.toHaveBeenCalled()
  })

  it('Test 4: 경기 시간대 밖(KST 13시 = UTC 04시) -> 200 + fetchTodayGames 호출되지 않음', async () => {
    // UTC 04:00 = KST 13:00 (경기 시간대 14~22시 밖)
    vi.setSystemTime(new Date('2026-04-05T04:00:00Z'))

    const req = createMockRequest({ signature: 'valid-signature', body: '' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(fetchTodayGames).not.toHaveBeenCalled()
  })

  it('Test 5: 크롤링 실패(CrawlerResult.success === false) -> 200 반환 + logger.error 호출', async () => {
    ;(fetchTodayGames as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: new Error('kbo-game network error'),
    })

    const req = createMockRequest({ signature: 'valid-signature', body: '' })
    const res = await POST(req)

    // D-01: 실패 시 200 반환하여 QStash 자동 재시도 방지
    expect(res.status).toBe(200)
    expect(logger.error).toHaveBeenCalled()
    expect(syncGames).not.toHaveBeenCalled()
  })

  it('Test 6: 크롤링 성공 + 경기 없음(빈 배열) -> 200 + syncGames([]) 호출', async () => {
    ;(fetchTodayGames as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      games: [],
    })
    ;(syncGames as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const req = createMockRequest({ signature: 'valid-signature', body: '' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(syncGames).toHaveBeenCalledWith([])
  })

  it('Test 7: 크롤링 성공 + 상태 전이 없음 -> 200 + logger.info에 transitionCount: 0', async () => {
    ;(fetchTodayGames as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      games: mockGames,
    })
    ;(syncGames as ReturnType<typeof vi.fn>).mockResolvedValue([]) // 상태 전이 없음

    const req = createMockRequest({ signature: 'valid-signature', body: '' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ transitionCount: 0 }),
      expect.any(String)
    )
  })
})
