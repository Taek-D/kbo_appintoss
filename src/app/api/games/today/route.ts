import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

function getTodayKst(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const today = getTodayKst()

    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_date', today)
      .order('started_at', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error({ err: error }, 'games/today: DB 조회 실패')
      return NextResponse.json({ error: '경기 정보를 불러올 수 없습니다' }, { status: 500 })
    }

    return NextResponse.json({ games: games ?? [] })
  } catch (err: unknown) {
    logger.error({ err }, 'games/today: 예상치 못한 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
