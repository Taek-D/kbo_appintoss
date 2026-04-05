/**
 * QStash Cron Schedule 등록 스크립트
 * 배포 후 1회 실행: npx tsx scripts/setup-qstash.ts
 *
 * 필요 환경변수:
 *   QSTASH_TOKEN - Upstash Console -> QStash -> Settings -> Token
 *   APP_URL - Vercel 배포 URL (예: https://kbo-game.vercel.app)
 */
import { Client } from '@upstash/qstash'

const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const APP_URL = process.env.APP_URL

if (!QSTASH_TOKEN) {
  console.error('QSTASH_TOKEN 환경변수가 필요합니다')
  process.exit(1)
}

if (!APP_URL) {
  console.error('APP_URL 환경변수가 필요합니다 (예: https://kbo-game.vercel.app)')
  process.exit(1)
}

const client = new Client({ token: QSTASH_TOKEN })

async function main() {
  const schedule = await client.schedules.create({
    destination: `${APP_URL}/api/cron/poll`,
    cron: '*/3 5-13 * * *', // UTC 05~13시 = KST 14~22시 (per D-09)
  })

  console.log('QStash Cron Schedule 등록 완료:')
  console.log(`  Schedule ID: ${schedule.scheduleId}`)
  console.log(`  Destination: ${APP_URL}/api/cron/poll`)
  console.log(`  Cron: */3 5-13 * * * (UTC) = 매 3분, KST 14~22시`)
  console.log('')
  console.log('QStash Dashboard에서 확인: https://console.upstash.com/qstash')
}

main().catch((err) => {
  console.error('QStash Schedule 등록 실패:', err)
  process.exit(1)
})
