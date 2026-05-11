import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { SEASON } from '@/types/season'

/**
 * F014: 응원팀 시즌 누적 전적 계산.
 *
 * - kbo_games 테이블만으로 1쿼리 계산 (PRD-014 §5.1, §5.2)
 * - 시즌 범위(`SEASON.startDate ~ endDate`) 내 `status='finished'` 경기만 대상
 * - 승률은 무승부 제외 (분모 0이면 0)
 *
 * 반환값에는 `rank`, `gamesBehind`가 없다 — team-rank.ts에서 합쳐 계산한다.
 */
export type TeamRawStats = {
  wins: number
  losses: number
  draws: number
  winRate: number
}

export async function computeSeasonStats(teamCode: string): Promise<TeamRawStats> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_games')
    .select('home_team, away_team, home_score, away_score')
    .eq('status', 'finished')
    .gte('game_date', SEASON.startDate)
    .lte('game_date', SEASON.endDate)
    .or(`home_team.eq.${teamCode},away_team.eq.${teamCode}`)

  if (error) {
    logger.error({ err: error, teamCode }, 'computeSeasonStats: DB 조회 실패')
    throw new Error(`시즌 전적 조회 실패: ${error.message}`)
  }

  let wins = 0
  let losses = 0
  let draws = 0

  for (const row of (data ?? []) as Array<{
    home_team: string
    away_team: string
    home_score: number
    away_score: number
  }>) {
    const isHome = row.home_team === teamCode
    const myScore = isHome ? row.home_score : row.away_score
    const oppScore = isHome ? row.away_score : row.home_score
    if (myScore > oppScore) wins += 1
    else if (myScore < oppScore) losses += 1
    else draws += 1
  }

  const denominator = wins + losses
  const winRate = denominator === 0 ? 0 : wins / denominator

  return { wins, losses, draws, winRate }
}
