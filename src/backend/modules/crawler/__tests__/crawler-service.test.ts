import { describe, it, expect, vi, beforeEach } from 'vitest'

// kbo-game 모듈 모킹
const mockGetGame = vi.fn()

vi.mock('kbo-game', () => ({
  getGame: (...args: unknown[]) => mockGetGame(...args),
}))

// 모듈은 RED 단계에서 아직 구현 전
import { fetchTodayGames } from '../crawler-service'

// kbo-game의 실제 Game 타입 (node_modules/kbo-game/dist/index.d.ts 기준)
type KboGame = {
  id: string
  date: Date
  startTime: string
  stadium: string
  homeTeam: string
  awayTeam: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED'
  score?: { home: number; away: number }
  currentInning?: number
  broadcastServices: string[]
  season: number
}

const mockKboGame: KboGame = {
  id: 'kbo-game-001',
  date: new Date('2026-04-05'),
  startTime: '18:30',
  stadium: '잠실',
  homeTeam: 'LG',
  awayTeam: 'KT',
  status: 'SCHEDULED',
  score: { home: 0, away: 0 },
  currentInning: 0,
  broadcastServices: [],
  season: 2026,
}

describe('fetchTodayGames', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1: getGame(new Date())이 정상 Game[]을 반환하면 { success: true, games: CrawlerGame[] }을 반환한다 (DATA-01)', async () => {
    mockGetGame.mockResolvedValue([mockKboGame])

    const result = await fetchTodayGames()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.games).toHaveLength(1)
      expect(result.games[0].kboGameId).toBe('kbo-game-001')
      expect(result.games[0].homeTeam).toBe('LG')
      expect(result.games[0].awayTeam).toBe('KT')
      expect(result.games[0].gameDate).toBe('2026-04-05')
      expect(result.games[0].status).toBe('scheduled')
    }
  })

  it('Test 2: getGame()이 null을 반환하면 { success: false, error: Error("kbo-game returned null") }을 반환한다 (DATA-04)', async () => {
    mockGetGame.mockResolvedValue(null)

    const result = await fetchTodayGames()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('kbo-game returned null')
    }
  })

  it('Test 3: getGame()이 빈 배열을 반환하면 { success: true, games: [] }을 반환한다 — null과 다른 코드 경로 (DATA-04)', async () => {
    mockGetGame.mockResolvedValue([])

    const result = await fetchTodayGames()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.games).toEqual([])
    }
  })

  it('Test 4: getGame()이 예외를 throw하면 { success: false, error }로 래핑한다 (DATA-04)', async () => {
    const thrownError = new Error('Network error')
    mockGetGame.mockRejectedValue(thrownError)

    const result = await fetchTodayGames()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('Network error')
    }
  })

  it('Test 5: kbo-game의 SCHEDULED/IN_PROGRESS/FINISHED/CANCELED가 scheduled/playing/finished/cancelled로 매핑된다', async () => {
    const games: KboGame[] = [
      { ...mockKboGame, id: '001', status: 'SCHEDULED' },
      { ...mockKboGame, id: '002', status: 'IN_PROGRESS' },
      { ...mockKboGame, id: '003', status: 'FINISHED' },
      { ...mockKboGame, id: '004', status: 'CANCELED' },
    ]
    mockGetGame.mockResolvedValue(games)

    const result = await fetchTodayGames()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.games[0].status).toBe('scheduled')
      expect(result.games[1].status).toBe('playing')
      expect(result.games[2].status).toBe('finished')
      expect(result.games[3].status).toBe('cancelled')
    }
  })
})

describe('mapKboStatusToDb (via game-state-mapper)', () => {
  it('Test 6: mapKboStatusToDb("SCHEDULED") === "scheduled"', async () => {
    const { mapKboStatusToDb } = await import('../game-state-mapper')
    expect(mapKboStatusToDb('SCHEDULED')).toBe('scheduled')
  })

  it('Test 7: mapKboStatusToDb("IN_PROGRESS") === "playing"', async () => {
    const { mapKboStatusToDb } = await import('../game-state-mapper')
    expect(mapKboStatusToDb('IN_PROGRESS')).toBe('playing')
  })

  it('Test 8: mapKboStatusToDb("FINISHED") === "finished"', async () => {
    const { mapKboStatusToDb } = await import('../game-state-mapper')
    expect(mapKboStatusToDb('FINISHED')).toBe('finished')
  })

  it('Test 9: mapKboStatusToDb("CANCELED") === "cancelled" (D 없음 -> D 있음)', async () => {
    const { mapKboStatusToDb } = await import('../game-state-mapper')
    expect(mapKboStatusToDb('CANCELED')).toBe('cancelled')
  })
})
