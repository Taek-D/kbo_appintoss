import { NextRequest, NextResponse } from 'next/server'
import { getTossUserKey, getUserById, getUserByTossKey } from '@/backend/modules/auth'
import { logger } from '@/lib/logger'

/**
 * Authorization 헤더에서 Bearer 토큰(userId) 추출
 */
function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

/**
 * GET /api/auth/me
 * Authorization header (Bearer userId) 또는 session cookie -> User 정보 반환
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authorization 헤더 우선 (토스 WebView 토큰 기반)
    const bearerUserId = extractBearerToken(request)
    if (bearerUserId) {
      const user = await getUserById(bearerUserId)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({
        user: { id: user.id, team_code: user.team_code, subscribed: user.subscribed },
      })
    }

    // 2. 쿠키 기반 fallback (웹 개발 환경)
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      const guestTeam = request.cookies.get('guest_team')?.value ?? null
      return NextResponse.json({
        user: {
          id: 'guest',
          team_code: guestTeam,
          subscribed: guestTeam !== null,
        },
      })
    }

    // accessToken으로 토스 userKey 조회
    const { userKey } = await getTossUserKey(sessionToken)

    // userKey로 DB에서 유저 조회
    const user = await getUserByTossKey(userKey)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        team_code: user.team_code,
        subscribed: user.subscribed,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'

    if (message.includes('토스 유저 조회 실패')) {
      logger.warn({ error: message }, '세션 토큰 만료/무효')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error({ error: message }, '/api/auth/me 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
