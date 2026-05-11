import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { LastGameSummary, NextGameSummary } from '@/types/season'

/**
 * F014: 응원팀 다음 경기 / 어제 결과 조회.
 *
 * - nextGame: status='scheduled' + started_at IS NOT NULL → 가장 가까운 1건
 *             (started_at null인 row는 시간 미정이라 정렬 불가 → 후순위)
 * - lastGame: status='finished' → 가장 최근 1건
 *
 * 두 쿼리를 병렬로 실행한다.
 */
export async function fetchNextGame(teamCode: string): Promise<NextGameSummary | null> {
  const supabase = await createServerSupabaseClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('kbo_games')
    .select('id, game_date, home_team, away_team, started_at')
    .eq('status', 'scheduled')
    .or(`home_team.eq.${teamCode},away_team.eq.${teamCode}`)
    .gte('started_at', nowIso)
    .order('started_at', { ascending: true, nullsFirst: false })
    .limit(1)

  if (error) {
    logger.error({ err: error, teamCode }, 'fetchNextGame: DB 조회 실패')
    throw new Error(`다음 경기 조회 실패: ${error.message}`)
  }

  const row = (data ?? [])[0] as
    | { id: string; game_date: string; home_team: string; away_team: string; started_at: string | null }
    | undefined

  if (!row) return null

  const msUntilStart = row.started_at !== null ? new Date(row.started_at).getTime() - Date.now() : null

  return {
    id: row.id,
    game_date: row.game_date,
    home_team: row.home_team,
    away_team: row.away_team,
    started_at: row.started_at,
    isHome: row.home_team === teamCode,
    msUntilStart,
  }
}

export async function fetchLastGame(teamCode: string): Promise<LastGameSummary | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_games')
    .select('id, game_date, home_team, away_team, home_score, away_score, finished_at')
    .eq('status', 'finished')
    .or(`home_team.eq.${teamCode},away_team.eq.${teamCode}`)
    .order('finished_at', { ascending: false, nullsFirst: false })
    .limit(1)

  if (error) {
    logger.error({ err: error, teamCode }, 'fetchLastGame: DB 조회 실패')
    throw new Error(`어제 결과 조회 실패: ${error.message}`)
  }

  const row = (data ?? [])[0] as
    | {
        id: string
        game_date: string
        home_team: string
        away_team: string
        home_score: number
        away_score: number
      }
    | undefined

  if (!row) return null

  // 무승부 → null, 이외 응원팀 승/패
  let myTeamWon: boolean | null
  if (row.home_score === row.away_score) {
    myTeamWon = null
  } else {
    const isHome = row.home_team === teamCode
    const myScore = isHome ? row.home_score : row.away_score
    const oppScore = isHome ? row.away_score : row.home_score
    myTeamWon = myScore > oppScore
  }

  return {
    id: row.id,
    game_date: row.game_date,
    home_team: row.home_team,
    away_team: row.away_team,
    home_score: row.home_score,
    away_score: row.away_score,
    myTeamWon,
  }
}
