import { z } from 'zod'

/**
 * Push 발송 요청 타입
 * CLAUDE.md: type 선호, enum 금지, Zod 사용
 */
export type TossPushRequest = {
  userKey: string // users.toss_user_key
  templateId: string // 검수 승인된 템플릿 ID
  templateArgs: Record<string, string> // 템플릿 변수 (팀 이름 등)
  deepLink?: string // /game/{gameId} (D-09)
}

/**
 * Push 발송 응답 타입
 */
export type TossPushResponse = {
  success: boolean
  errorCode?: string // '429', '401', 'NETWORK_ERROR' 등
  errorMessage?: string
}

/**
 * push_logs.status 컬럼 값
 * CLAUDE.md: enum 절대 금지 → z.enum()으로 런타임 검증
 */
export const PushLogStatusSchema = z.enum(['sent', 'failed', 'rate_limited'])
export type PushLogStatus = z.infer<typeof PushLogStatusSchema>

/**
 * 알림 타입 (finished, cancelled만 — D-03: 시작 알림 제외)
 */
export type NotificationType = 'finished' | 'cancelled'

/**
 * PushProvider 인터페이스 (의존성 주입용)
 * 토스 Push API 통신 계층 — 비즈니스 로직(NotificationService)과 분리
 */
export type PushProvider = {
  send: (request: TossPushRequest) => Promise<TossPushResponse>
}
