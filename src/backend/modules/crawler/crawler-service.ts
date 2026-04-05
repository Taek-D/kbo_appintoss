import { getGame } from 'kbo-game'
import { logger } from '@/lib/logger'
import { mapKboStatusToDb } from './game-state-mapper'
import type { CrawlerResult, CrawlerGame } from '@/types/crawler'

/**
 * kbo-game 패키지에서 오늘 경기 데이터를 수집한다.
 * null(크롤링 실패)과 [](경기 없음)을 분리된 코드 경로로 처리한다 (DATA-01, DATA-04).
 */
export async function fetchTodayGames(): Promise<CrawlerResult> {
  try {
    const games = await getGame(new Date())

    if (games === null) {
      const error = new Error('kbo-game returned null')
      logger.error({ err: error }, 'kbo-game 크롤링 실패: null 반환')
      return { success: false, error }
    }

    const crawlerGames: CrawlerGame[] = games.map((game) => ({
      kboGameId: game.id,
      gameDate: formatDate(game.date),
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      status: mapKboStatusToDb(game.status),
      homeScore: game.score?.home ?? 0,
      awayScore: game.score?.away ?? 0,
      currentInning: game.currentInning ?? 0,
      startTime: game.startTime,
    }))

    return { success: true, games: crawlerGames }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error({ err }, 'kbo-game fetchTodayGames 오류')
    return { success: false, error: err }
  }
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환한다.
 * kbo-game의 game.date는 Date 객체이다.
 */
function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
