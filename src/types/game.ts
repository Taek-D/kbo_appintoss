/**
 * 경기 상태 - DB status 컬럼과 매핑
 * CLAUDE.md: enum 절대 금지 -> 문자열 리터럴 유니온 사용
 */
export type GameStatus = 'scheduled' | 'playing' | 'finished' | 'cancelled'

export type Game = {
  id: string
  game_date: string
  home_team: string
  away_team: string
  status: GameStatus
  home_score: number
  away_score: number
  inning_data: Record<string, unknown> | null
  started_at: string | null
  finished_at: string | null
  is_notified_start: boolean
  is_notified_finish: boolean
  is_notified_cancel: boolean
  created_at: string
  updated_at: string
}
