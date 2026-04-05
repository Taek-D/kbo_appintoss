import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const gameIdSchema = z.string().uuid()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const parsed = gameIdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', parsed.data)
      .single()

    if (error || !game) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ game })
  } catch (err: unknown) {
    logger.error({ err, gameId: id }, 'games/[id]: 예상치 못한 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
