import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getTossUserKey,
  getUserByTossKey,
  updateNotificationPrefs,
} from '@/backend/modules/auth'
import { logger } from '@/lib/logger'

/**
 * F013: 알림 종류별 선호 갱신.
 * 마스터 스위치(subscribed)는 별도 — PUT/DELETE /api/subscription 사용.
 *
 * Validation:
 *   - notify_finish / notify_cancel 두 필드 모두 optional이지만,
 *     refine으로 "최소 한 개"는 반드시 포함되어야 한다.
 */
const PrefsRequestSchema = z
  .object({
    notify_finish: z.boolean().optional(),
    notify_cancel: z.boolean().optional(),
  })
  .refine(
    (data) => data.notify_finish !== undefined || data.notify_cancel !== undefined,
    { message: '최소 한 개 필드(notify_finish 또는 notify_cancel)를 보내야 합니다' },
  )

/**
 * Authorization 헤더 또는 세션 쿠키에서 유저 ID를 추출한다.
 * subscription/route.ts와 동일한 패턴을 따른다.
 */
async function extractUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7)
  }

  const sessionToken = request.cookies.get('session_token')?.value
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
 * PATCH /api/notification-preferences
 * 알림 종류별 선호를 부분 갱신한다.
 *
 * Body: { notify_finish?: boolean, notify_cancel?: boolean }
 * Response 200: { success: true, user: AuthUser }
 *
 * 게스트(id === 'guest')는 서버 저장 없이 인메모리 응답만 반환 (차후 토스 로그인 시 동기화).
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await extractUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody: unknown = await request.json()
    const parsed = PrefsRequestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '유효하지 않은 요청입니다' },
        { status: 400 },
      )
    }

    // 게스트: 서버 저장 없이 인메모리 응답만 (subscription/route.ts와 동일한 게스트 패턴)
    if (userId === 'guest') {
      const guestTeam = request.cookies.get('guest_team')?.value ?? null
      return NextResponse.json({
        success: true,
        user: {
          id: 'guest',
          team_code: guestTeam,
          subscribed: guestTeam !== null,
          notify_finish: parsed.data.notify_finish ?? true,
          notify_cancel: parsed.data.notify_cancel ?? true,
        },
      })
    }

    // 실제 사용자 — DB 갱신.
    // updateNotificationPrefs는 .single()로 갱신된 row를 반환하므로,
    // userId가 존재하지 않으면 throw → catch 블록에서 500 처리된다.
    const user = await updateNotificationPrefs(userId, parsed.data)
    return NextResponse.json({ success: true, user })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    logger.error({ error: message }, 'PATCH /api/notification-preferences 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
