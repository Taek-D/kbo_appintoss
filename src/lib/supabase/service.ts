import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Supabase 클라이언트
 * QStash webhook(poll/route.ts) 등 cookies() 없는 서버 환경에서 사용
 * 모든 유저 데이터 접근이 필요한 경우 SUPABASE_SERVICE_ROLE_KEY 사용
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다')
  }

  return createClient(url, key)
}
