import { getGame } from 'kbo-game'
import { logger } from '@/lib/logger'
import { mapKboStatusToDb } from './game-state-mapper'
import { normalizeTeamCode } from './team-code-mapper'
import type { CrawlerResult, CrawlerGame } from '@/types/crawler'

/**
 * kbo-game 패키지에서 오늘 경기 데이터를 수집한다.
 * null(크롤링 실패)과 [](경기 없음)을 분리된 코드 경로로 처리한다 (DATA-01, DATA-04).
 */
export async function fetchTodayGames(): Promise<CrawlerResult> {
  return fetchGamesByDate(new Date())
}

/**
 * kbo-game 패키지에서 특정 날짜의 경기 데이터를 수집한다.
 * 백필(시즌 과거 데이터 채우기)에 사용한다.
 */
export async function fetchGamesByDate(date: Date): Promise<CrawlerResult> {
  try {
    const games = await getGame(date)

    if (games === null) {
      const error = new Error('kbo-game returned null')
      logger.error({ err: error }, 'kbo-game 크롤링 실패: null 반환')
      return { success: false, error }
    }

    // kbo-game의 raw 팀 이름(한글/영문 약어 혼재)을 시스템 TeamCode로 정규화한다.
    // 매핑 불가 팀이 섞이면 해당 경기는 스킵하고 경고를 남긴다(전체 크롤링은 계속).
    const crawlerGames: CrawlerGame[] = []
    for (const game of games) {
      const homeTeam = normalizeTeamCode(game.homeTeam)
      const awayTeam = normalizeTeamCode(game.awayTeam)
      if (homeTeam === null || awayTeam === null) {
        logger.warn(
          { rawHome: game.homeTeam, rawAway: game.awayTeam, gameId: game.id },
          'fetchTodayGames: 팀 코드 매핑 실패 — 경기 스킵',
        )
        continue
      }
      crawlerGames.push({
        kboGameId: game.id,
        gameDate: formatDate(game.date),
        homeTeam,
        awayTeam,
        status: mapKboStatusToDb(game.status),
        homeScore: game.score?.home ?? 0,
        awayScore: game.score?.away ?? 0,
        currentInning: game.currentInning ?? 0,
        startTime: game.startTime,
      })
    }

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
