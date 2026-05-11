import { NextResponse } from 'next/server'
import { z } from 'zod'
import { backfillGames, fetchGamesByDate } from '@/backend/modules/crawler'
import { logger } from '@/lib/logger'

/**
 * 관리자용 시즌 백필 엔드포인트.
 *
 * 사용 시나리오:
 *   cron poller가 멈춰서 과거 일자 데이터가 비어 있을 때, 시즌 시작일부터
 *   현재까지 일자별로 kbo-game을 호출해 kbo_games 테이블을 일괄 채운다.
 *
 * 인증:
 *   - 쿼리: ?token=<ADMIN_TOKEN>
 *   - 또는 헤더: Authorization: Bearer <ADMIN_TOKEN>
 *
 * 파라미터:
 *   - from: 시작일 (YYYY-MM-DD, 포함)
 *   - to:   종료일 (YYYY-MM-DD, 포함). 생략 시 오늘(KST)
 *   - delayMs: 각 일자 호출 사이 대기 ms (기본 250) — KBO 사이트 부하 방어
 *
 * 한도:
 *   - 최대 31일까지. 더 긴 범위는 분할 호출 권장 (Vercel 60s 타임아웃 보호)
 *
 * 호출 예:
 *   curl 'https://kbogame.vercel.app/api/admin/backfill-season?token=<TOKEN>&from=2026-03-23&to=2026-04-23'
 */

const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from은 YYYY-MM-DD 형식'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to는 YYYY-MM-DD 형식')
    .optional(),
  delayMs: z.coerce.number().int().min(0).max(5000).default(250),
})

const MAX_DAYS = 31

function parseKstDate(dateStr: string): Date {
  // YYYY-MM-DD 입력을 KST 자정 기준 Date로 변환
  return new Date(`${dateStr}T00:00:00+09:00`)
}

function formatKstDate(date: Date): string {
  const kst = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const yyyy = kst.getFullYear()
  const mm = String(kst.getMonth() + 1).padStart(2, '0')
  const dd = String(kst.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_TOKEN 환경변수가 설정되지 않았습니다' },
      { status: 503 },
    )
  }

  const url = new URL(request.url)
  const token =
    url.searchParams.get('token') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''
  if (token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = QuerySchema.safeParse({
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to') ?? undefined,
    delayMs: url.searchParams.get('delayMs') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '잘못된 파라미터' },
      { status: 400 },
    )
  }

  const fromDate = parseKstDate(parsed.data.from)
  const toDate = parsed.data.to
    ? parseKstDate(parsed.data.to)
    : new Date(formatKstDate(new Date()) + 'T00:00:00+09:00')

  if (fromDate.getTime() > toDate.getTime()) {
    return NextResponse.json({ error: 'from이 to보다 늦습니다' }, { status: 400 })
  }

  const dayMs = 24 * 60 * 60 * 1000
  const totalDays = Math.floor((toDate.getTime() - fromDate.getTime()) / dayMs) + 1
  if (totalDays > MAX_DAYS) {
    return NextResponse.json(
      { error: `한 번에 최대 ${MAX_DAYS}일까지. 요청: ${totalDays}일` },
      { status: 400 },
    )
  }

  type DayResult = {
    date: string
    success: boolean
    fetched: number
    upserted: number
    error?: string
  }
  const results: DayResult[] = []
  let totalUpserted = 0

  for (let i = 0; i < totalDays; i++) {
    const cursorDate = new Date(fromDate.getTime() + i * dayMs)
    const dateStr = formatKstDate(cursorDate)

    try {
      const fetched = await fetchGamesByDate(cursorDate)
      if (!fetched.success) {
        results.push({
          date: dateStr,
          success: false,
          fetched: 0,
          upserted: 0,
          error: fetched.error.message,
        })
      } else {
        const upserted = await backfillGames(fetched.games)
        totalUpserted += upserted
        results.push({
          date: dateStr,
          success: true,
          fetched: fetched.games.length,
          upserted,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error({ err, date: dateStr }, 'backfill-season: 일자 처리 실패')
      results.push({
        date: dateStr,
        success: false,
        fetched: 0,
        upserted: 0,
        error: message,
      })
    }

    if (i < totalDays - 1 && parsed.data.delayMs > 0) {
      await sleep(parsed.data.delayMs)
    }
  }

  return NextResponse.json({
    ok: true,
    from: parsed.data.from,
    to: formatKstDate(toDate),
    totalDays,
    totalUpserted,
    results,
  })
}
