import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { TossAuthResponse, TossReferrer, TossUserInfo } from '@/types/toss'

/**
 * 토스 API 응답 검증용 Zod 스키마
 * CLAUDE.md: 타입 단언 as 사용 최소화, Zod parse로 검증
 */
const TossAuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number(),
})

const TossUserInfoSchema = z.object({
  userKey: z.string(),
})

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im'

/**
 * 토스 OAuth2 authCode를 accessToken으로 교환한다 [AUTH-01]
 * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 */
export async function exchangeAuthCode(
  authCode: string,
  referrer: TossReferrer
): Promise<TossAuthResponse> {
  const baseUrl = process.env.TOSS_API_BASE_URL || TOSS_API_BASE
  const url = `${baseUrl}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authorizationCode: authCode,
      referrer,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    logger.error(
      { status: response.status, errorBody },
      '토스 authCode 교환 실패'
    )
    throw new Error(
      `토스 인증 실패 (${response.status}): ${response.statusText}`
    )
  }

  const rawData: unknown = await response.json()
  const parsed = TossAuthResponseSchema.safeParse(rawData)

  if (!parsed.success) {
    logger.error({ errors: parsed.error.issues }, '토스 응답 스키마 검증 실패')
    throw new Error('토스 API 응답 형식이 올바르지 않습니다')
  }

  return parsed.data
}

/**
 * accessToken으로 토스 유저 정보(userKey)를 조회한다 [AUTH-01]
 * GET /api-partner/v1/apps-in-toss/user/oauth2/login-me
 */
export async function getTossUserKey(
  accessToken: string
): Promise<TossUserInfo> {
  const baseUrl = process.env.TOSS_API_BASE_URL || TOSS_API_BASE
  const url = `${baseUrl}/api-partner/v1/apps-in-toss/user/oauth2/login-me`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    logger.error(
      { status: response.status, errorBody },
      '토스 userKey 조회 실패'
    )
    throw new Error(
      `토스 유저 조회 실패 (${response.status}): ${response.statusText}`
    )
  }

  const rawData: unknown = await response.json()
  const parsed = TossUserInfoSchema.safeParse(rawData)

  if (!parsed.success) {
    logger.error({ errors: parsed.error.issues }, '토스 유저 응답 스키마 검증 실패')
    throw new Error('토스 유저 API 응답 형식이 올바르지 않습니다')
  }

  return parsed.data
}
