import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { NotificationPreferences, TeamCode, User } from '@/types/user'

/**
 * TeamCode 런타임 검증용 Zod 스키마
 * CLAUDE.md: enum 절대 금지 -> z.enum() 사용
 */
const TeamCodeSchema = z.enum([
  'HH', 'OB', 'LG', 'KT', 'SS', 'NC', 'SK', 'LT', 'WO', 'KI',
])

/**
 * 토스 userKey로 유저를 생성하거나 기존 유저를 반환한다.
 * 신규: subscribed=false, team_code=null
 * 기존: onConflict로 기존 레코드 반환 (중복 생성 방지) [AUTH-03]
 */
export async function upsertUser(tossUserKey: string): Promise<User> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_users')
    .upsert(
      { toss_user_key: tossUserKey },
      { onConflict: 'toss_user_key' }
    )
    .select()
    .single()

  if (error) {
    logger.error({ error, tossUserKey }, 'upsertUser 실패')
    throw new Error(`유저 upsert 실패: ${error.message}`)
  }

  return data as User
}

/**
 * DB id로 유저를 조회한다.
 * Authorization: Bearer <userId> 토큰 기반 인증에서 사용.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_users')
    .select()
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    logger.error({ error, userId }, 'getUserById 실패')
    throw new Error(`유저 조회 실패: ${error.message}`)
  }

  return data as User
}

/**
 * 토스 userKey로 유저를 조회한다.
 * 존재하면 User 반환, 없으면 null 반환.
 */
export async function getUserByTossKey(tossUserKey: string): Promise<User | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_users')
    .select()
    .eq('toss_user_key', tossUserKey)
    .single()

  if (error) {
    // PGRST116: "The result contains 0 rows" - not found
    if (error.code === 'PGRST116') {
      return null
    }
    logger.error({ error, tossUserKey }, 'getUserByTossKey 실패')
    throw new Error(`유저 조회 실패: ${error.message}`)
  }

  return data as User
}

/**
 * 유저의 응원팀 코드를 업데이트한다.
 * Zod로 TeamCode 유효성 검증 후 update. subscribed=true도 함께 설정 [AUTH-02, AUTH-04]
 */
export async function updateTeamCode(userId: string, teamCode: TeamCode): Promise<User> {
  // Zod로 런타임 TeamCode 검증
  const parsed = TeamCodeSchema.safeParse(teamCode)
  if (!parsed.success) {
    throw new Error(`유효하지 않은 팀 코드: ${teamCode}`)
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_users')
    .update({ team_code: parsed.data, subscribed: true })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    logger.error({ error, userId, teamCode }, 'updateTeamCode 실패')
    throw new Error(`팀 코드 업데이트 실패: ${error.message}`)
  }

  return data as User
}

/**
 * 유저의 구독 상태를 업데이트한다 [SUB-01]
 * 갱신된 User 레코드를 반환하여 클라이언트 캐시 동기화에 사용한다.
 */
export async function updateSubscription(userId: string, subscribed: boolean): Promise<User> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_users')
    .update({ subscribed })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    logger.error({ error, userId, subscribed }, 'updateSubscription 실패')
    throw new Error(`구독 상태 업데이트 실패: ${error.message}`)
  }

  return data as User
}

/**
 * F013: 알림 종류별 선호 갱신.
 * 부분 갱신을 지원하며, 최소 한 개 이상의 필드가 포함되어야 한다 (라우트 단의 Zod에서 사전 검증).
 * 마스터 스위치(subscribed)는 별도 — 이 함수는 종류별 플래그만 다룬다.
 */
export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPreferences,
): Promise<User> {
  // 어느 필드도 정의되지 않은 경우 방어 (라우트에서 이미 검증되지만 이중 안전망)
  if (prefs.notify_finish === undefined && prefs.notify_cancel === undefined) {
    throw new Error('최소 한 개 알림 선호 필드가 필요합니다')
  }

  const payload: Record<string, boolean> = {}
  if (prefs.notify_finish !== undefined) payload.notify_finish = prefs.notify_finish
  if (prefs.notify_cancel !== undefined) payload.notify_cancel = prefs.notify_cancel

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kbo_users')
    .update(payload)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    logger.error({ error, userId, payload }, 'updateNotificationPrefs 실패')
    throw new Error(`알림 선호 업데이트 실패: ${error.message}`)
  }

  return data as User
}
