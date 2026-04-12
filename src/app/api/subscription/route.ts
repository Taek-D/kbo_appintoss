import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getTossUserKey,
  getUserByTossKey,
  updateTeamCode,
  updateSubscription,
} from '@/backend/modules/auth'
import { logger } from '@/lib/logger'

/**
 * 응원팀 업데이트 요청 body 검증 스키마
 */
const UpdateTeamRequestSchema = z.object({
  team_code: z.enum(['HH', 'OB', 'LG', 'KT', 'SS', 'NC', 'SK', 'LT', 'WO', 'KI']),
})

/**
 * 세션 쿠키에서 유저 ID를 추출하는 헬퍼
 */
async function extractUserId(request: NextRequest): Promise<string | null> {
  const sessionToken = request.cookies.get('session_token')?.value

  // TODO: 토스 인증 연동 후 제거 — 임시 게스트 모드
  if (!sessionToken) {
    return 'guest'
  }

  try {
    const { userKey } = await getTossUserKey(sessionToken)
    const user = await getUserByTossKey(userKey)
    return user?.id ?? null
  } catch {
    return null
  }
}

/**
 * PUT /api/subscription
 * 응원팀 저장/변경 -> team_code 갱신 + subscribed=true [AUTH-02, AUTH-04]
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await extractUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody: unknown = await request.json()
    const parsed = UpdateTeamRequestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '유효하지 않은 팀 코드입니다' },
        { status: 400 }
      )
    }

    // TODO: 토스 인증 연동 후 제거 — 게스트는 쿠키에 팀 저장
    if (userId === 'guest') {
      const res = NextResponse.json({
        success: true,
        user: { id: 'guest', team_code: parsed.data.team_code, subscribed: true },
      })
      // F008: cross-origin(miniapp) 대응 — session_token과 동일한 SameSite/Secure 정책.
      res.cookies.set('guest_team', parsed.data.team_code, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      })
      return res
    }

    const user = await updateTeamCode(userId, parsed.data.team_code)

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    logger.error({ error: message }, 'PUT /api/subscription 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * DELETE /api/subscription
 * 구독 해제 -> subscribed=false [SUB-01]
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await extractUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: 토스 인증 연동 후 제거 — 게스트는 쿠키 삭제
    if (userId === 'guest') {
      const res = NextResponse.json({ success: true })
      res.cookies.delete('guest_team')
      return res
    }

    await updateSubscription(userId, false)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    logger.error({ error: message }, 'DELETE /api/subscription 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
