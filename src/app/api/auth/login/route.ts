import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { exchangeAuthCode, getTossUserKey, upsertUser } from '@/backend/modules/auth'
import { logger } from '@/lib/logger'

/**
 * 로그인 요청 body 검증 스키마
 */
const LoginRequestSchema = z.object({
  authorizationCode: z.string().min(1, 'authorizationCode는 필수입니다'),
  referrer: z.enum(['sandbox', 'DEFAULT']).default('DEFAULT'),
})

/**
 * POST /api/auth/login
 * authCode -> accessToken -> userKey -> DB upsert -> session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json()
    const parsed = LoginRequestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다' },
        { status: 400 }
      )
    }

    const { authorizationCode, referrer } = parsed.data

    // 1. authCode -> accessToken
    const authResponse = await exchangeAuthCode(authorizationCode, referrer)

    // 2. accessToken -> userKey
    const { userKey } = await getTossUserKey(authResponse.accessToken)

    // 3. userKey -> DB upsert
    const user = await upsertUser(userKey)

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        team_code: user.team_code,
        subscribed: user.subscribed,
      },
      token: user.id,
    })

    // 토스 WebView(Origin: null)에서는 Set-Cookie를 내리면 WebKit이 fetch를 차단한다
    // (Allow-Credentials가 꺼진 CORS 응답에 쿠키가 실리면 스펙 위반으로 간주).
    // 웹 브라우저(Origin 있음)만 쿠키 기반 세션을 사용하고, WebView는 Bearer 토큰으로 인증한다.
    const origin = request.headers.get('origin')
    if (origin !== 'null') {
      response.cookies.set('session_token', authResponse.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 3600,
        path: '/',
      })
    }

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'

    if (message.includes('토스 인증 실패')) {
      logger.warn({ error: message }, '로그인 인증 실패')
      return NextResponse.json({ error: '인증에 실패했습니다' }, { status: 401 })
    }

    const stack = error instanceof Error ? error.stack : undefined
    let causeInfo: unknown = undefined
    if (error instanceof Error && 'cause' in error && error.cause) {
      const c = error.cause
      if (c instanceof Error) {
        causeInfo = { name: c.name, message: c.message, code: (c as { code?: unknown }).code }
      }
    }
    logger.error({ error: message, stack, causeInfo }, '로그인 처리 중 오류')
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', debug: { message, cause: causeInfo } },
      { status: 500 }
    )
  }
}
