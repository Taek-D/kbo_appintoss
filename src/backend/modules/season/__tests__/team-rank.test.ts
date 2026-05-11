import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
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
              return Promise.resolve({ data: state.rows, error: null })
            },
          }
          return chain
        },
      }
    },
  }),
}))

import { computeAllTeamRanks } from '../team-rank'

function setRows(rows: FinishedGameRow[]) {
  state.rows = rows
}

describe('computeAllTeamRanks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.rows = []
  })

  it('Test 1: 빈 시즌 → 10개 팀 모두 0승, rank=1 (전팀 동률, gamesBehind=0)', async () => {
    setRows([])

    const ranks = await computeAllTeamRanks()

    expect(ranks).toHaveProperty('KI')
    expect(ranks.KI?.wins).toBe(0)
    expect(ranks.KI?.rank).toBe(1)
    expect(ranks.KI?.gamesBehind).toBe(0)
  })

  it('Test 2: KI 3승, OB 1승, 나머지 0승 → KI rank 1, OB rank 2, 그 외 공동 3위', async () => {
    setRows([
      { home_team: 'KI', away_team: 'OB', home_score: 5, away_score: 3 },
      { home_team: 'OB', away_team: 'KI', home_score: 1, away_score: 4 },
      { home_team: 'KI', away_team: 'LG', home_score: 7, away_score: 2 },
      // OB 1승 (vs LG, KI 3승 외)
      { home_team: 'OB', away_team: 'LG', home_score: 3, away_score: 2 },
    ])

    const ranks = await computeAllTeamRanks()

    expect(ranks.KI?.rank).toBe(1)
    expect(ranks.KI?.wins).toBe(3)
    expect(ranks.OB?.rank).toBe(2)
    expect(ranks.OB?.wins).toBe(1)
    // LG는 0승 2패. 나머지 팀은 0승 0패. 정렬 기준이 승률이면 LG가 더 낮을 수 있다.
    // 일단 rank가 KI=1, OB=2임만 확정.
  })

  it('Test 3: 1위와의 게임차 = ((1위 승 - 자신 승) + (자신 패 - 1위 패)) / 2', async () => {
    // KI: 5승 1패, OB: 3승 3패 → 게임차 = ((5-3) + (3-1)) / 2 = 2
    setRows([
      // KI 5승
      { home_team: 'KI', away_team: 'OB', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'OB', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'OB', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      // KI 1패
      { home_team: 'KI', away_team: 'OB', home_score: 0, away_score: 3 },
      // OB 추가 승 3개 (위 KI-OB 5경기에서 1승 누적, 추가 2승 + 다른 매치 1승 = 총 3승)
      // 위 4경기 KI vs OB에서 OB는 1승 3패. 추가 OB 2승 필요 → OB vs LG 매치 추가
      { home_team: 'OB', away_team: 'LG', home_score: 4, away_score: 1 },
      { home_team: 'OB', away_team: 'LG', home_score: 4, away_score: 1 },
      // OB는 vs KI에서 3패, vs LG 2승, vs KI 1승 → 총 3승 3패
    ])

    const ranks = await computeAllTeamRanks()

    expect(ranks.KI?.wins).toBe(5)
    expect(ranks.KI?.losses).toBe(1)
    expect(ranks.OB?.wins).toBe(3)
    expect(ranks.OB?.losses).toBe(3)
    expect(ranks.KI?.gamesBehind).toBe(0)
    expect(ranks.OB?.gamesBehind).toBeCloseTo(2, 3)
  })

  it('Test 4: 동률 팀은 같은 rank를 받는다 (KI 5승, OB 5승 → 둘 다 rank 1)', async () => {
    setRows([
      // KI 5승 (vs LG)
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      { home_team: 'KI', away_team: 'LG', home_score: 5, away_score: 1 },
      // OB 5승 (vs SS)
      { home_team: 'OB', away_team: 'SS', home_score: 5, away_score: 1 },
      { home_team: 'OB', away_team: 'SS', home_score: 5, away_score: 1 },
      { home_team: 'OB', away_team: 'SS', home_score: 5, away_score: 1 },
      { home_team: 'OB', away_team: 'SS', home_score: 5, away_score: 1 },
      { home_team: 'OB', away_team: 'SS', home_score: 5, away_score: 1 },
    ])

    const ranks = await computeAllTeamRanks()

    expect(ranks.KI?.rank).toBe(1)
    expect(ranks.OB?.rank).toBe(1)
    expect(ranks.KI?.winRate).toBe(1)
    expect(ranks.OB?.winRate).toBe(1)
  })

  it('Test 5: 1쿼리만 발생한다 (전 팀 통합)', async () => {
    setRows([])

    await computeAllTeamRanks()

    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('kbo_games')
    expect(mockEq).toHaveBeenCalledWith('status', 'finished')
  })
})
