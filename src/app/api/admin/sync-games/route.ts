import { NextResponse } from 'next/server'
import { fetchTodayGames, syncGames } from '@/backend/modules/crawler'
import { logger } from '@/lib/logger'

/**
 * 관리자용 즉시 동기화 엔드포인트.
 *
 * 일반적으로는 QStash → /api/cron/poll 이 14~22시 KST 동안 폴링하지만,
 * 신규 배포 직후 또는 디버깅 시 즉시 데이터를 채워야 할 때 사용한다.
 *
 * 인증: ADMIN_TOKEN 환경변수와 일치하는 ?token=... 쿼리 또는
 *      Authorization: Bearer <token> 헤더.
 *
 * 호출 예:
 *   curl 'https://kbogame.vercel.app/api/admin/sync-games?token=<TOKEN>'
 */
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

  const result = await fetchTodayGames()
  if (!result.success) {
    logger.error({ error: result.error.message }, 'admin/sync-games: 크롤링 실패')
    return NextResponse.json(
      { error: '크롤링 실패', message: result.error.message },
      { status: 502 },
    )
  }

  const transitions = await syncGames(result.games)

  return NextResponse.json({
    ok: true,
    fetched: result.games.length,
    transitions: transitions.length,
    games: result.games.map((g) => ({
      kboGameId: g.kboGameId,
      gameDate: g.gameDate,
      home: g.homeTeam,
      away: g.awayTeam,
      status: g.status,
      score: `${g.awayScore}-${g.homeScore}`,
    })),
  })
}
