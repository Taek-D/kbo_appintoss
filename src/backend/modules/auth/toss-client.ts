import https from 'node:https'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { TossAuthResponse, TossReferrer, TossUserInfo } from '@/types/toss'

/**
 * 토스 파트너 API는 공통 envelope 구조로 응답한다.
 *   성공: { resultType: 'SUCCESS', success: <data>, error: null }
 *   실패: { resultType: 'FAIL', success: null, error: { errorCode, reason, ... } }
 * HTTP는 대부분 200이고, 성공/실패는 resultType으로 구분한다.
 */
const TossErrorSchema = z.object({
  errorCode: z.string(),
  reason: z.string().optional(),
  errorType: z.number().optional(),
})

const TossEnvelopeSchema = z.object({
  resultType: z.enum(['SUCCESS', 'FAIL']),
  success: z.unknown().nullable().optional(),
  error: TossErrorSchema.nullable().optional(),
})

const TossAuthSuccessSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  // 토스는 실무상 'Bearer'/'bearer' 둘 다 가능 — literal 대신 string 관대 수용
  tokenType: z.string(),
  expiresIn: z.number(),
})

const TossUserInfoSchema = z.object({
  userKey: z.string(),
})

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im'

/**
 * 토스 파트너 API는 mTLS 클라이언트 인증서를 요구한다.
 * TOSS_MTLS_CERT / TOSS_MTLS_KEY 환경변수에 base64 인코딩된 PEM 쌍을 둔다.
 *
 * Node 22의 global fetch(undici)는 https.Agent의 cert/key를 사용하지 않으므로,
 * node:https.request로 직접 요청한다.
 */
let _agent: https.Agent | null = null

function getMtlsAgent(): https.Agent {
  if (_agent) return _agent
  const certB64 = process.env.TOSS_MTLS_CERT
  const keyB64 = process.env.TOSS_MTLS_KEY
  if (!certB64 || !keyB64) {
    throw new Error('mTLS 환경변수(TOSS_MTLS_CERT/TOSS_MTLS_KEY)가 설정되지 않았습니다')
  }
  _agent = new https.Agent({
    cert: Buffer.from(certB64, 'base64'),
    key: Buffer.from(keyB64, 'base64'),
    keepAlive: true,
  })
  return _agent
}

type MtlsResponse = { status: number; body: string }

function mtlsRequest(
  method: 'GET' | 'POST',
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<MtlsResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
        agent: getMtlsAgent(),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        )
      },
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

/**
 * 토스 OAuth2 authCode를 accessToken으로 교환한다 [AUTH-01]
 * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 */
export async function exchangeAuthCode(
  authCode: string,
  referrer: TossReferrer,
): Promise<TossAuthResponse> {
  const baseUrl = process.env.TOSS_API_BASE_URL || TOSS_API_BASE
  const url = `${baseUrl}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`

  const response = await mtlsRequest(
    'POST',
    url,
    {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    JSON.stringify({ authorizationCode: authCode, referrer }),
  )

  if (response.status < 200 || response.status >= 300) {
    logger.error({ status: response.status, body: response.body }, '토스 authCode 교환 HTTP 실패')
    throw new Error(`토스 인증 실패 (${response.status}): ${response.body.slice(0, 200)}`)
  }

  const rawData = safeParse(response.body)
  const envelope = TossEnvelopeSchema.safeParse(rawData)
  if (!envelope.success) {
    logger.error({ errors: envelope.error.issues, rawData }, '토스 envelope 검증 실패')
    throw new Error('토스 API 응답 형식이 올바르지 않습니다')
  }

  if (envelope.data.resultType === 'FAIL' || !envelope.data.success) {
    const errorCode = envelope.data.error?.errorCode ?? 'UNKNOWN'
    const reason = envelope.data.error?.reason ?? '원인 미상'
    logger.warn({ errorCode, reason }, '토스 authCode 교환 실패(FAIL)')
    throw new Error(`토스 인증 실패 (${errorCode}): ${reason}`)
  }

  const parsed = TossAuthSuccessSchema.safeParse(envelope.data.success)
  if (!parsed.success) {
    logger.error({ errors: parsed.error.issues, success: envelope.data.success }, '토스 success 스키마 실패')
    throw new Error('토스 API 응답 형식이 올바르지 않습니다')
  }
  return parsed.data
}

/**
 * accessToken으로 토스 유저 정보(userKey)를 조회한다 [AUTH-01]
 * GET /api-partner/v1/apps-in-toss/user/oauth2/login-me
 */
export async function getTossUserKey(accessToken: string): Promise<TossUserInfo> {
  const baseUrl = process.env.TOSS_API_BASE_URL || TOSS_API_BASE
  const url = `${baseUrl}/api-partner/v1/apps-in-toss/user/oauth2/login-me`

  const response = await mtlsRequest('GET', url, {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  })

  if (response.status < 200 || response.status >= 300) {
    logger.error({ status: response.status, body: response.body }, '토스 userKey 조회 HTTP 실패')
    throw new Error(`토스 유저 조회 실패 (${response.status}): ${response.body.slice(0, 200)}`)
  }

  const rawData = safeParse(response.body)
  const envelope = TossEnvelopeSchema.safeParse(rawData)
  if (!envelope.success) {
    logger.error({ errors: envelope.error.issues, rawData }, '토스 유저 envelope 검증 실패')
    throw new Error('토스 유저 API 응답 형식이 올바르지 않습니다')
  }

  if (envelope.data.resultType === 'FAIL' || !envelope.data.success) {
    const errorCode = envelope.data.error?.errorCode ?? 'UNKNOWN'
    const reason = envelope.data.error?.reason ?? '원인 미상'
    logger.warn({ errorCode, reason }, '토스 userKey 조회 실패(FAIL)')
    throw new Error(`토스 유저 조회 실패 (${errorCode}): ${reason}`)
  }

  const parsed = TossUserInfoSchema.safeParse(envelope.data.success)
  if (!parsed.success) {
    logger.error({ errors: parsed.error.issues, success: envelope.data.success }, '토스 유저 success 스키마 실패')
    throw new Error('토스 유저 API 응답 형식이 올바르지 않습니다')
  }
  return parsed.data
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
