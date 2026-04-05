import { Receiver } from '@upstash/qstash'
import { fetchTodayGames, syncGames } from '@/backend/modules/crawler'
import { logger } from '@/lib/logger'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export async function POST(req: Request): Promise<Response> {
  // 1. QStash 서명 검증 (D-07)
  const signature = req.headers.get('Upstash-Signature')
  if (!signature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.text()
  try {
    await receiver.verify({ body, signature })
  } catch {
    return new Response('Invalid signature', { status: 401 })
  }

  // 2. 경기 시간대 체크 (D-09: 14~22시 KST)
  const now = new Date()
  const kstHour = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  ).getHours()

  if (kstHour < 14 || kstHour >= 22) {
    logger.info({ kstHour }, 'Outside game hours, skipping poll')
    return new Response('Outside game hours', { status: 200 })
  }

  // 3. 크롤링 (DATA-01)
  const result = await fetchTodayGames()

  if (!result.success) {
    // D-01: 실패 시 다음 폴링에서 재시도. 200 반환하여 QStash 자동 재시도 방지
    // D-02: logger로 에러 기록
    logger.error({ error: result.error.message }, 'Crawling failed, will retry next poll')
    return new Response('Crawl failed', { status: 200 })
  }

  // 4. DB 동기화 + 상태 전이 감지 (DATA-02)
  const transitions = await syncGames(result.games)

  // Phase 3 Handoff Contract:
  // transitions(StateTransition[])는 Phase 3에서 Push 알림 트리거로 사용된다.
  // Phase 3 구현 시 이 지점에서 transitions를 순회하며:
  //   - toStatus === 'playing'  -> 경기 시작 알림 (is_notified_start 체크)
  //   - toStatus === 'finished' -> 경기 종료 알림 (is_notified_finish 체크)
  //   - toStatus === 'cancelled' -> 경기 취소 알림 (is_notified_cancel 체크)
  // 각 전이에 대해 해당 팀 구독자를 조회하고 Push 발송 후 is_notified_* 플래그를 업데이트한다.
  // transitions의 gameId(DB uuid)로 games 테이블에서 is_notified_* 상태를 조회/갱신한다.
  logger.info(
    {
      gamesCount: result.games.length,
      transitionCount: transitions.length,
      transitions: transitions.map((t) => ({
        from: t.fromStatus,
        to: t.toStatus,
        teams: `${t.game.homeTeam} vs ${t.game.awayTeam}`,
      })),
    },
    'Poll complete'
  )

  return new Response('OK', { status: 200 })
}
