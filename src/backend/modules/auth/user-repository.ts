import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { TeamCode, User } from '@/types/user'

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
    .from('users')
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
 * 토스 userKey로 유저를 조회한다.
 * 존재하면 User 반환, 없으면 null 반환.
 */
export async function getUserByTossKey(tossUserKey: string): Promise<User | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('users')
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
    .from('users')
    .update({ team_code: parsed.data, subscribed: true })
    .eq('id', userId)

  if (error) {
    logger.error({ error, userId, teamCode }, 'updateTeamCode 실패')
    throw new Error(`팀 코드 업데이트 실패: ${error.message}`)
  }

  return data as unknown as User
}

/**
 * 유저의 구독 상태를 업데이트한다 [SUB-01]
 */
export async function updateSubscription(userId: string, subscribed: boolean): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('users')
    .update({ subscribed })
    .eq('id', userId)

  if (error) {
    logger.error({ error, userId, subscribed }, 'updateSubscription 실패')
    throw new Error(`구독 상태 업데이트 실패: ${error.message}`)
  }
}
