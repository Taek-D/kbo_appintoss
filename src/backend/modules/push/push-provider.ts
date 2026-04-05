import https from 'node:https'
import { logger } from '@/lib/logger'
import type { TossPushRequest, TossPushResponse, PushProvider } from '@/types/push'

const TOSS_PUSH_API_URL =
  process.env.TOSS_PUSH_API_URL ?? 'https://push-api.toss.im/send'

/**
 * mTLS Agent를 생성한다.
 * TOSS_MTLS_CERT, TOSS_MTLS_KEY 환경변수가 base64 인코딩된 PEM 인증서를 담고 있어야 한다.
 */
function createMtlsAgent(): https.Agent {
  const cert = process.env.TOSS_MTLS_CERT
  const key = process.env.TOSS_MTLS_KEY

  if (!cert || !key) {
    throw new Error('mTLS 인증서 환경변수가 설정되지 않았습니다')
  }

  return new https.Agent({
    cert: Buffer.from(cert, 'base64'),
    key: Buffer.from(key, 'base64'),
  })
}

/**
 * 토스 Push API와 통신하는 PushProvider 팩토리 함수.
 * mTLS 인증서 로드, API 호출, 에러 핸들링만 담당한다.
 * 비즈니스 로직(구독자 조회, 오케스트레이션)은 NotificationService에서 담당한다.
 */
export function createPushProvider(): PushProvider {
  const agent = createMtlsAgent()

  return {
    async send(request: TossPushRequest): Promise<TossPushResponse> {
      try {
        const response = await fetch(TOSS_PUSH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userKey: request.userKey,
            templateId: request.templateId,
            templateArgs: request.templateArgs,
            deepLink: request.deepLink,
          }),
          // @ts-expect-error -- Node.js fetch에서 agent 전달 (mTLS)
          agent,
        })

        if (!response.ok) {
          const errorText = await response.text()
          return {
            success: false,
            errorCode: String(response.status),
            errorMessage: errorText || response.statusText,
          }
        }

        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error({ err: error }, 'Push API 네트워크 에러')
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          errorMessage: message,
        }
      }
    },
  }
}
