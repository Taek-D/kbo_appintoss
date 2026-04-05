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

/**
 * 이닝별 점수 데이터 구조
 * DB inning_data JSONB에서 파싱한 타입
 * 현재 game-repository에서 null로 upsert하므로 항상 null 가능성 있음
 */
export type InningScore = {
  inning: number
  home: number
  away: number
}

/**
 * inning_data JSONB -> InningScore[] 파싱 유틸
 * null이면 빈 배열 반환 (graceful fallback)
 * any 금지 -> unknown + 타입 가드 (per CLAUDE.md)
 */
export function parseInningData(raw: Record<string, unknown> | null): InningScore[] {
  if (!raw) return []
  const innings = raw['innings']
  if (!Array.isArray(innings)) return []
  return innings
    .filter((item: unknown): item is { inning: number; home: number; away: number } => {
      if (typeof item !== 'object' || item === null) return false
      const obj = item as Record<string, unknown>
      return typeof obj['inning'] === 'number'
        && typeof obj['home'] === 'number'
        && typeof obj['away'] === 'number'
    })
    .map(({ inning, home, away }) => ({ inning, home, away }))
}
