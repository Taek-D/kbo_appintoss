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
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      currentInning: game.currentInning,
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
 * YYYYMMDD 형식의 날짜를 YYYY-MM-DD 형식으로 변환한다.
 */
function formatDate(date: string): string {
  if (date.length === 8) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  }
  return date
}
