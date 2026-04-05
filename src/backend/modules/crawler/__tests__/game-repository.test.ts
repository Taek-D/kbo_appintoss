import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Game } from '@/types/game'
import type { CrawlerGame, StateTransition } from '@/types/crawler'

// Supabase 클라이언트 모킹 (auth 모듈 테스트 패턴 따름)
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockUpsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs)
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs)
              return mockEq()
            },
          }
        },
        upsert: (...upsertArgs: unknown[]) => {
          mockUpsert(...upsertArgs)
          return Promise.resolve({ error: null })
        },
      }
    },
  }),
}))

// 모듈은 RED 단계에서 아직 구현 전
import { syncGames } from '../game-repository'

// 오늘 날짜 (KST)
const TODAY = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`

const makeDbGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'db-uuid-001',
  game_date: TODAY_STR,
  home_team: 'LG',
  away_team: 'KT',
  status: 'scheduled',
  home_score: 0,
  away_score: 0,
  inning_data: null,
  started_at: null,
  finished_at: null,
  is_notified_start: false,
  is_notified_finish: false,
  is_notified_cancel: false,
  created_at: '2026-04-05T00:00:00Z',
  updated_at: '2026-04-05T00:00:00Z',
  ...overrides,
})

const makeCrawlerGame = (overrides: Partial<CrawlerGame> = {}): CrawlerGame => ({
  kboGameId: 'kbo-001',
  gameDate: TODAY_STR,
  homeTeam: 'LG',
  awayTeam: 'KT',
  status: 'scheduled',
  homeScore: 0,
  awayScore: 0,
  currentInning: 0,
  startTime: '18:30',
  ...overrides,
})

describe('syncGames', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1: 새 경기(DB에 없음)를 syncGames()하면 upsert 호출되고 빈 transitions[] 반환 (신규 경기는 전이 아님)', async () => {
    // DB에 경기 없음
    mockEq.mockResolvedValue({ data: [], error: null })

    const game = makeCrawlerGame()
    const transitions = await syncGames([game])

    expect(transitions).toEqual([])
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const upsertPayload = mockUpsert.mock.calls[0][0]
    expect(upsertPayload).toMatchObject({
      game_date: TODAY_STR,
      home_team: 'LG',
      away_team: 'KT',
      status: 'scheduled',
    })
  })

  it('Test 2: DB에 status="scheduled"인 경기가 있고 크롤링 결과 status="playing"이면 StateTransition { fromStatus: "scheduled", toStatus: "playing" } 반환 (DATA-02)', async () => {
    const dbGame = makeDbGame({ status: 'scheduled' })
    mockEq.mockResolvedValue({ data: [dbGame], error: null })

    const crawledGame = makeCrawlerGame({ status: 'playing', homeScore: 0, awayScore: 0, currentInning: 1 })
    const transitions = await syncGames([crawledGame])

    expect(transitions).toHaveLength(1)
    const t = transitions[0] as StateTransition
    expect(t.fromStatus).toBe('scheduled')
    expect(t.toStatus).toBe('playing')
    expect(t.gameId).toBe(dbGame.id)
    expect(t.kboGameId).toBe('kbo-001')
  })

  it('Test 3: DB에 status="playing"인 경기가 있고 크롤링 결과 status="finished"이면 StateTransition { fromStatus: "playing", toStatus: "finished" } 반환 (DATA-02)', async () => {
    const dbGame = makeDbGame({ status: 'playing' })
    mockEq.mockResolvedValue({ data: [dbGame], error: null })

    const crawledGame = makeCrawlerGame({ status: 'finished', homeScore: 5, awayScore: 3 })
    const transitions = await syncGames([crawledGame])

    expect(transitions).toHaveLength(1)
    const t = transitions[0] as StateTransition
    expect(t.fromStatus).toBe('playing')
    expect(t.toStatus).toBe('finished')
  })

  it('Test 4: DB에 status="scheduled"인 경기가 있고 크롤링 결과 status="cancelled"이면 StateTransition { fromStatus: "scheduled", toStatus: "cancelled" } 반환 (DATA-02)', async () => {
    const dbGame = makeDbGame({ status: 'scheduled' })
    mockEq.mockResolvedValue({ data: [dbGame], error: null })

    const crawledGame = makeCrawlerGame({ status: 'cancelled' })
    const transitions = await syncGames([crawledGame])

    expect(transitions).toHaveLength(1)
    const t = transitions[0] as StateTransition
    expect(t.fromStatus).toBe('scheduled')
    expect(t.toStatus).toBe('cancelled')
  })

  it('Test 5: 상태가 동일하면 (playing -> playing) transitions가 비어있다', async () => {
    const dbGame = makeDbGame({ status: 'playing' })
    mockEq.mockResolvedValue({ data: [dbGame], error: null })

    const crawledGame = makeCrawlerGame({ status: 'playing', currentInning: 5 })
    const transitions = await syncGames([crawledGame])

    expect(transitions).toEqual([])
  })

  it('Test 6: upsert 페이로드에 is_notified_start, is_notified_finish, is_notified_cancel 필드가 포함되지 않는다 (기존 플래그 덮어쓰기 방지, per D-06)', async () => {
    mockEq.mockResolvedValue({ data: [], error: null })

    await syncGames([makeCrawlerGame()])

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const upsertPayload = mockUpsert.mock.calls[0][0]
    expect(upsertPayload).not.toHaveProperty('is_notified_start')
    expect(upsertPayload).not.toHaveProperty('is_notified_finish')
    expect(upsertPayload).not.toHaveProperty('is_notified_cancel')
    // 구 컬럼도 없어야 함
    expect(upsertPayload).not.toHaveProperty('is_notified')
  })

  it('Test 7: 빈 CrawlerGame[]로 syncGames()하면 upsert 호출 없이 빈 transitions[] 반환', async () => {
    mockEq.mockResolvedValue({ data: [], error: null })

    const transitions = await syncGames([])

    expect(transitions).toEqual([])
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('Test 8: game_date가 오늘인 경기만 DB에서 조회한다 (select where game_date = today)', async () => {
    mockEq.mockResolvedValue({ data: [], error: null })

    await syncGames([makeCrawlerGame()])

    expect(mockFrom).toHaveBeenCalledWith('games')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('game_date', TODAY_STR)
  })
})
