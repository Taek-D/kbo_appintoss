import { logger } from '@/lib/logger'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { KBO_TEAMS } from '@/types/user'
import type { PushProvider } from '@/types/push'
import type { StateTransition } from '@/types/crawler'

/**
 * 100ms delay 헬퍼 (토스 Push Rate Limit: 발송 간격 100ms 이상)
 * PUSH-02 준수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 팀 코드를 팀 이름으로 변환 (KBO_TEAMS 상수 참조)
 */
function getTeamName(teamCode: string): string {
  return KBO_TEAMS.find((t) => t.code === teamCode)?.name ?? teamCode
}

/**
 * 단일 경기의 구독자에게 Push 알림을 순차 발송한다.
 * - 구독자 조회 (users 테이블, team_code IN [homeTeam, awayTeam])
 * - 순차 발송 (100ms 간격, D-04, PUSH-02)
 * - 429 응답 시 1초 대기 후 1회 재시도 (D-08)
 * - push_logs 기록 (PUSH-05)
 * - is_notified_finish / is_notified_cancel 플래그 업데이트
 */
async function sendNotificationsForGame(
  transition: StateTransition,
  pushProvider: PushProvider
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { gameId, toStatus, game } = transition
  const { homeTeam, awayTeam } = game

  // 1. 구독자 조회 (홈팀 + 원정팀)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, toss_user_key')
    .in('team_code', [homeTeam, awayTeam])
    .eq('subscribed', true)

  if (usersError) {
    logger.error({ err: usersError, gameId }, 'Failed to fetch subscribers')
    throw usersError
  }

  if (!users || users.length === 0) {
    logger.info({ gameId, homeTeam, awayTeam }, 'No subscribers for game, skipping')
    // is_notified 플래그는 구독자 없어도 업데이트 (중복 발송 방지)
    await updateNotifiedFlag(supabase, gameId, toStatus)
    return
  }

  // 2. 알림 메시지 구성 (D-01, D-02, D-09)
  const homeTeamName = getTeamName(homeTeam)
  const awayTeamName = getTeamName(awayTeam)
  const deepLink = `/game/${gameId}`
  const templateId =
    toStatus === 'finished'
      ? process.env.TOSS_TEMPLATE_ID_FINISHED ?? 'tmpl-finished'
      : process.env.TOSS_TEMPLATE_ID_CANCELLED ?? 'tmpl-cancelled'

  const templateArgs: Record<string, string> = {
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    message:
      toStatus === 'finished'
        ? '경기가 끝났어요! 탭해서 확인해보세요'
        : '경기가 취소되었어요',
  }

  // 3. 순차 발송 (D-04: for-of 루프)
  for (const user of users) {
    let status: 'sent' | 'failed' | 'rate_limited' = 'sent'
    let errorMessage: string | null = null

    const request = {
      userKey: user.toss_user_key,
      templateId,
      templateArgs,
      deepLink,
    }

    // 첫 번째 발송 시도
    let response = await pushProvider.send(request)

    // 429 응답 시 1초 대기 후 1회 재시도 (D-08)
    if (!response.success && response.errorCode === '429') {
      await delay(1000)
      response = await pushProvider.send(request)

      if (!response.success && response.errorCode === '429') {
        status = 'rate_limited'
        errorMessage = response.errorMessage ?? 'Rate limited'
      } else if (!response.success) {
        status = 'failed'
        errorMessage = response.errorMessage ?? null
      }
    } else if (!response.success) {
      status = 'failed'
      errorMessage = response.errorMessage ?? null
    }

    // push_logs 기록 (PUSH-05)
    const { error: logError } = await supabase.from('push_logs').insert({
      user_id: user.id,
      game_id: gameId,
      status,
      error_message: errorMessage,
    })

    if (logError) {
      logger.error({ err: logError, userId: user.id, gameId }, 'Failed to insert push_log')
    }

    logger.info(
      { userId: user.id, gameId, status, toStatus },
      'Push notification sent'
    )

    // 100ms delay (D-04, PUSH-02) — 마지막 유저 이후에는 불필요하지만 단순화를 위해 항상 적용
    await delay(100)
  }

  // 4. is_notified 플래그 업데이트
  await updateNotifiedFlag(supabase, gameId, toStatus)
}

/**
 * is_notified_finish 또는 is_notified_cancel 플래그를 true로 업데이트한다.
 */
async function updateNotifiedFlag(
  supabase: ReturnType<typeof createServiceRoleClient>,
  gameId: string,
  toStatus: string
): Promise<void> {
  const updatePayload =
    toStatus === 'finished'
      ? { is_notified_finish: true }
      : { is_notified_cancel: true }

  const { error } = await supabase
    .from('games')
    .update(updatePayload)
    .eq('id', gameId)

  if (error) {
    logger.error({ err: error, gameId, toStatus }, 'Failed to update is_notified flag')
  }
}

/**
 * 경기 종료/취소 알림을 발송하는 메인 오케스트레이터.
 *
 * - transitions를 필터링: toStatus === 'finished' || 'cancelled' 만 처리 (D-03)
 * - Promise.allSettled()로 동시 경기 병렬 처리 (D-06, PUSH-03)
 * - 각 경기 발송 실패가 다른 경기를 블로킹하지 않음
 */
export async function sendGameEndNotifications(
  transitions: StateTransition[],
  pushProvider: PushProvider
): Promise<void> {
  // D-03: finished/cancelled 만 처리 (playing, scheduled 무시)
  const endTransitions = transitions.filter(
    (t) => t.toStatus === 'finished' || t.toStatus === 'cancelled'
  )

  if (endTransitions.length === 0) {
    return
  }

  // D-06, PUSH-03: 동시 경기 병렬 처리 (블로킹 없음)
  const results = await Promise.allSettled(
    endTransitions.map((transition) =>
      sendNotificationsForGame(transition, pushProvider)
    )
  )

  // 실패한 경기 로깅 (전체 파이프라인에 영향 없음)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const transition = endTransitions[index]
      logger.error(
        { err: result.reason, gameId: transition?.gameId },
        'sendNotificationsForGame failed'
      )
    }
  })
}
