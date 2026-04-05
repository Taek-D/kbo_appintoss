import { Receiver } from '@upstash/qstash'
import { fetchTodayGames, syncGames } from '@/backend/modules/crawler'
import { sendGameEndNotifications, createPushProvider } from '@/backend/modules/push'
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

  // 5. Push 알림 발송 (PUSH-01, PUSH-03)
  if (transitions.length > 0) {
    try {
      const pushProvider = createPushProvider()
      await sendGameEndNotifications(transitions, pushProvider)
      logger.info(
        {
          transitionCount: transitions.length,
          transitions: transitions.map((t) => ({
            from: t.fromStatus,
            to: t.toStatus,
            teams: `${t.game.homeTeam} vs ${t.game.awayTeam}`,
          })),
        },
        'Push notifications sent'
      )
    } catch (error) {
      // Push 발송 실패가 폴링 전체를 실패시키면 안 됨
      logger.error({ err: error }, 'Push notification failed')
    }
  }

  logger.info(
    {
      gamesCount: result.games.length,
      transitionCount: transitions.length,
    },
    'Poll complete'
  )

  return new Response('OK', { status: 200 })
}
