import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockOr = vi.fn()
const mockFrom = vi.fn()

type FinishedGameRow = {
  home_team: string
  away_team: string
  home_score: number
  away_score: number
}

const state: { rows: FinishedGameRow[] } = { rows: [] }

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs)
          const chain = {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs)
              return chain
            },
            gte: (...gteArgs: unknown[]) => {
              mockGte(...gteArgs)
              return chain
            },
            lte: (...lteArgs: unknown[]) => {
              mockLte(...lteArgs)
              return chain
            },
            or: (...orArgs: unknown[]) => {
              mockOr(...orArgs)
              return Promise.resolve({ data: state.rows, error: null })
            },
          }
          return chain
        },
      }
    },
  }),
}))

import { computeSeasonStats } from '../season-stats'

function setRows(rows: FinishedGameRow[]) {
  state.rows = rows
}

describe('computeSeasonStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.rows = []
  })

  it('Test 1: 응원팀이 홈인 승리 1건 → 1승 0패 0무', async () => {
    setRows([{ home_team: 'KI', away_team: 'OB', home_score: 5, away_score: 3 }])

    const stats = await computeSeasonStats('KI')

    expect(stats.wins).toBe(1)
    expect(stats.losses).toBe(0)
    expect(stats.draws).toBe(0)
  })

  it('Test 2: 응원팀이 원정인 승리 1건 → 1승 0패 0무', async () => {
    setRows([{ home_team: 'OB', away_team: 'KI', home_score: 2, away_score: 7 }])

    const stats = await computeSeasonStats('KI')

    expect(stats.wins).toBe(1)
    expect(stats.losses).toBe(0)
  })

  it('Test 3: 응원팀이 홈인 패배 1건 → 0승 1패', async () => {
    setRows([{ home_team: 'KI', away_team: 'OB', home_score: 1, away_score: 4 }])

    const stats = await computeSeasonStats('KI')

    expect(stats.wins).toBe(0)
    expect(stats.losses).toBe(1)
  })

  it('Test 4: 동점(무승부) 1건 → 0승 0패 1무', async () => {
    setRows([{ home_team: 'KI', away_team: 'OB', home_score: 3, away_score: 3 }])

    const stats = await computeSeasonStats('KI')

    expect(stats.draws).toBe(1)
    expect(stats.wins).toBe(0)
    expect(stats.losses).toBe(0)
  })

  it('Test 5: 5승 3패 1무 → 승률 0.625 (무승부 제외)', async () => {
    const rows: FinishedGameRow[] = [
      // 5승 (홈 3승 + 원정 2승)
      { home_team: 'KI', away_team: 'OB', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 4, away_score: 2 },
      { home_team: 'KI', away_team: 'SS', home_score: 7, away_score: 3 },
      { home_team: 'NC', away_team: 'KI', home_score: 1, away_score: 5 },
      { home_team: 'KT', away_team: 'KI', home_score: 2, away_score: 6 },
      // 3패 (홈 2패 + 원정 1패)
      { home_team: 'KI', away_team: 'WO', home_score: 0, away_score: 3 },
      { home_team: 'KI', away_team: 'HH', home_score: 1, away_score: 5 },
      { home_team: 'LT', away_team: 'KI', home_score: 8, away_score: 2 },
      // 1무
      { home_team: 'KI', away_team: 'SK', home_score: 4, away_score: 4 },
    ]
    setRows(rows)

    const stats = await computeSeasonStats('KI')

    expect(stats.wins).toBe(5)
    expect(stats.losses).toBe(3)
    expect(stats.draws).toBe(1)
    expect(stats.winRate).toBeCloseTo(5 / 8, 3)
  })

  it('Test 6: 경기 없음 → 0승 0패 0무, 승률 0', async () => {
    setRows([])

    const stats = await computeSeasonStats('KI')

    expect(stats.wins).toBe(0)
    expect(stats.losses).toBe(0)
    expect(stats.draws).toBe(0)
    expect(stats.winRate).toBe(0)
  })

  it('Test 7: kbo_games 테이블, status=finished, game_date 시즌 범위, home/away in (teamCode) 조회', async () => {
    setRows([])

    await computeSeasonStats('KI')

    expect(mockFrom).toHaveBeenCalledWith('kbo_games')
    expect(mockEq).toHaveBeenCalledWith('status', 'finished')
    expect(mockGte).toHaveBeenCalledWith('game_date', '2026-03-23')
    expect(mockLte).toHaveBeenCalledWith('game_date', '2026-10-31')
    expect(mockOr).toHaveBeenCalledWith('home_team.eq.KI,away_team.eq.KI')
  })
})
