/**
 * 토스 미니앱 SDK 관련 타입
 * CLAUDE.md: enum 절대 금지 -> 문자열 리터럴 유니온 사용
 */
export type TossReferrer = 'sandbox' | 'DEFAULT'

export type TossAuthResponse = {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type TossUserInfo = {
  userKey: string
}
