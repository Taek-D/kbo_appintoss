import https from 'node:https'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { TossAuthResponse, TossReferrer, TossUserInfo } from '@/types/toss'

/**
 * 토스 파트너 API 응답 처리.
 *
 * 응답 형식이 두 가지가 혼재한다:
 *   1) Envelope: { resultType: 'SUCCESS'|'FAIL', success: <data>|null, error: {...}|null }
 *   2) Flat:     <data> 자체 (해지해 등 참조 구현이 사용)
 *
 * unwrapTossResponse가 둘 다 받아들이고, 핵심 데이터(success or rawData)를 반환한다.
 * FAIL인 경우 errorCode/reason을 추출해 throw.
 *
 * userKey 등 일부 필드는 number로 올 수 있어 z.coerce.string()으로 강제 변환한다.
 */

const TossAuthSuccessSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
})

const TossUserInfoSchema = z.object({
  userKey: z.coerce.string(),
})

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im'

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

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * 토스 응답에서 핵심 데이터를 추출한다.
 * Envelope이면 resultType/error 검사 후 success 반환,
 * Flat이면 그대로 반환.
 *
 * FAIL 케이스는 throw('토스 인증 실패 (...)') — login route catch에서 401로 변환된다.
 */
function unwrapTossResponse(rawData: unknown, kind: '인증' | '유저 조회'): unknown {
  if (rawData && typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>
    const isEnvelope = 'resultType' in obj || 'success' in obj
    if (isEnvelope) {
      const resultType = obj.resultType
      const errorObj = obj.error as { errorCode?: unknown; reason?: unknown } | null | undefined
      if (resultType === 'FAIL' || (errorObj && errorObj.errorCode)) {
        const code = String(errorObj?.errorCode ?? 'UNKNOWN')
        const reason = String(errorObj?.reason ?? '원인 미상')
        throw new Error(`토스 ${kind} 실패 (${code}): ${reason}`)
      }
      return obj.success ?? rawData
    }
  }
  return rawData
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
  const data = unwrapTossResponse(rawData, '인증')
  const parsed = TossAuthSuccessSchema.safeParse(data)
  if (!parsed.success) {
    logger.error({ errors: parsed.error.issues, rawData }, '토스 인증 응답 스키마 실패')
    throw new Error(
      `토스 API 응답 형식이 올바르지 않습니다: ${JSON.stringify(rawData).slice(0, 300)}`,
    )
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
  const data = unwrapTossResponse(rawData, '유저 조회')
  const parsed = TossUserInfoSchema.safeParse(data)
  if (!parsed.success) {
    logger.error({ errors: parsed.error.issues, rawData }, '토스 유저 응답 스키마 실패')
    throw new Error(
      `토스 유저 API 응답 형식이 올바르지 않습니다: ${JSON.stringify(rawData).slice(0, 300)}`,
    )
  }
  return parsed.data
}
