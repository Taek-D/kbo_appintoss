/**
 * F014: 응원팀 시즌 위젯 데이터 타입.
 *
 * CLAUDE.md 컨벤션: type 선호, enum 금지, any 금지.
 * kbo_games 테이블만으로 모두 계산 가능 — DB 변경 없음 (PRD-014 §5.1).
 */

export type SeasonStats = {
  year: number
  wins: number
  losses: number
  draws: number
  /** 무승부 제외 승률. 분모 0이면 0. */
  winRate: number
  /** 1-base 순위. 동률이면 동일 rank. */
  rank: number
  /** 1위와의 게임차. 1위면 0. */
  gamesBehind: number
}

export type NextGameSummary = {
  id: string
  game_date: string
  home_team: string
  away_team: string
  /** 경기 시작 ISO. null이면 시간 미정. */
  started_at: string | null
  /** 응원팀이 홈인지 여부. */
  isHome: boolean
  /** 응원팀 다음 경기 시작까지 밀리초. started_at이 null이면 null. */
  msUntilStart: number | null
}

export type LastGameSummary = {
  id: string
  game_date: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  /** 무승부면 null, 이외엔 응원팀 승/패 여부. */
  myTeamWon: boolean | null
}

export type TeamWidget = {
  season: SeasonStats
  nextGame: NextGameSummary | null
  lastGame: LastGameSummary | null
}

/**
 * 시즌 설정 — 환경변수 또는 코드 상수로 관리한다 (PRD-014 §5.3).
 * 2026 시즌은 3월 23일 ~ 10월 31일.
 */
export const SEASON = {
  year: 2026,
  startDate: '2026-03-23',
  endDate: '2026-10-31',
} as const
