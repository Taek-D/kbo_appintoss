import type { GameStatus } from '@/types/game'

/**
 * kbo-game 패키지의 경기 상태 (대문자)
 * CLAUDE.md: enum 절대 금지 -> 문자열 리터럴 유니온 사용
 */
export type KboGameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED'

/**
 * kbo-game Game을 내부 표현으로 변환한 타입
 * kboGameId: kbo-game의 id 원본 보존 (DB uuid와 별도)
 */
export type CrawlerGame = {
  kboGameId: string        // kbo-game의 id 원본 보존
  gameDate: string         // YYYYMMDD -> YYYY-MM-DD 변환
  homeTeam: string
  awayTeam: string
  status: GameStatus       // 이미 소문자로 변환된 상태
  homeScore: number
  awayScore: number
  currentInning: number
  startTime: string
}

/**
 * CrawlerService 반환 타입 (discriminated union)
 * null(크롤링 실패)과 [](경기 없음)을 분리된 코드 경로로 처리
 */
export type CrawlerResult =
  | { success: true; games: CrawlerGame[] }
  | { success: false; error: Error }

/**
 * 상태 전이 감지 결과 타입 (per D-04, D-05)
 * GameRepository.syncGames()가 반환
 */
export type StateTransition = {
  gameId: string           // DB games.id (uuid)
  kboGameId: string        // kbo-game 원본 ID
  fromStatus: GameStatus
  toStatus: GameStatus
  game: CrawlerGame
}
