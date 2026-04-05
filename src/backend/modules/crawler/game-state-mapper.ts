import type { GameStatus } from '@/types/game'
import type { KboGameStatus } from '@/types/crawler'

/**
 * kbo-game 대문자 상태를 DB 소문자 상태로 매핑하는 순수 함수
 * CANCELED(미국식) -> cancelled(영국식) 변환 포함
 */
const STATUS_MAP: Record<KboGameStatus, GameStatus> = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'playing',
  FINISHED: 'finished',
  CANCELED: 'cancelled',  // 미국식 CANCELED -> 영국식 cancelled
} as const

export function mapKboStatusToDb(kboStatus: KboGameStatus): GameStatus {
  return STATUS_MAP[kboStatus]
}
