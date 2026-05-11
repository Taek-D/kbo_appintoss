import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { SEASON } from '@/types/season'

/**
 * F014: 전체 KBO 10팀의 시즌 누적 전적 + 순위 + 게임차 계산.
 *
 * 단일 쿼리로 시즌 내 finished 경기를 모두 가져온 뒤, 메모리에서 각 팀별로 집계한다.
 * Per PRD-014 §6.1, 위젯 응답에 `rank`와 `gamesBehind`가 필요하므로 전체 팀 통계가 선행되어야 한다.
 *
 * - 정렬 기준: 승수 내림차순 → 패수 오름차순 (KBO 공식 순위 규칙 단순화 버전)
 * - 동률은 같은 rank를 받는다 (1, 1, 3, 4, ...)
 * - gamesBehind = ((1위 승 − 자신 승) + (자신 패 − 1위 패)) / 2
 */

export const KBO_TEAM_CODES = ['HH', 'OB', 'LG', 'KT', 'SS', 'NC', 'SK', 'LT', 'WO', 'KI'] as const
export type KboTeamCode = (typeof KBO_TEAM_CODES)[number]

export type TeamRankStats = {
  teamCode: KboTeamCode
  wins: number
  losses: number
  draws: number
  winRate: number
  rank: number
  gamesBehind: number
}

export type TeamRankMap = Partial<Record<KboTeamCode, TeamRankStats>>

type FinishedGameRow = {
  home_team: string
  away_team: string
  home_score: number
  away_score: number
}

export async function computeAllTeamRanks(): Promise<TeamRankMap> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_games')
    .select('home_team, away_team, home_score, away_score')
    .eq('status', 'finished')
    .gte('game_date', SEASON.startDate)
    .lte('game_date', SEASON.endDate)

  if (error) {
    logger.error({ err: error }, 'computeAllTeamRanks: DB 조회 실패')
    throw new Error(`전체 시즌 전적 조회 실패: ${error.message}`)
  }

  // 팀별 카운터 초기화 (10팀 모두 0으로 시작)
  const counters = new Map<KboTeamCode, { wins: number; losses: number; draws: number }>()
  for (const code of KBO_TEAM_CODES) {
    counters.set(code, { wins: 0, losses: 0, draws: 0 })
  }

  for (const row of (data ?? []) as FinishedGameRow[]) {
    const home = row.home_team as KboTeamCode
    const away = row.away_team as KboTeamCode

    if (row.home_score > row.away_score) {
      counters.get(home)!.wins += 1
      counters.get(away)!.losses += 1
    } else if (row.home_score < row.away_score) {
      counters.get(away)!.wins += 1
      counters.get(home)!.losses += 1
    } else {
      counters.get(home)!.draws += 1
      counters.get(away)!.draws += 1
    }
  }

  // 정렬용 배열 변환
  const rawList = KBO_TEAM_CODES.map((teamCode) => {
    const c = counters.get(teamCode)!
    const denominator = c.wins + c.losses
    return {
      teamCode,
      wins: c.wins,
      losses: c.losses,
      draws: c.draws,
      winRate: denominator === 0 ? 0 : c.wins / denominator,
    }
  })

  // 순위: 승수 desc → 패수 asc
  const sorted = [...rawList].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.losses - b.losses
  })

  // 1위 통계 (gamesBehind 기준)
  const top = sorted[0] ?? { wins: 0, losses: 0 }

  // 동률 처리: 같은 (wins, losses) → 같은 rank, 다음 rank는 인덱스+1
  const result: TeamRankMap = {}
  let lastKey = ''
  let lastRank = 0
  sorted.forEach((entry, idx) => {
    const key = `${entry.wins}_${entry.losses}`
    if (key !== lastKey) {
      lastRank = idx + 1
      lastKey = key
    }
    const gamesBehind = ((top.wins - entry.wins) + (entry.losses - top.losses)) / 2
    result[entry.teamCode] = {
      ...entry,
      rank: lastRank,
      gamesBehind: Math.max(0, gamesBehind),
    }
  })

  return result
}
