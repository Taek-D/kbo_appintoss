import { NextRequest, NextResponse } from 'next/server'
import { getTossUserKey, getUserByTossKey } from '@/backend/modules/auth'
import { logger } from '@/lib/logger'

/**
 * GET /api/auth/me
 * session cookie -> userKey -> User 정보 반환
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
