import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { Game } from '@/types/game'
import type { CrawlerGame, StateTransition } from '@/types/crawler'

/**
 * 오늘 날짜를 KST 기준으로 YYYY-MM-DD 형식으로 반환한다.
 */
function getTodayKst(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * 크롤링 결과를 DB에 upsert하고 상태 전이를 감지한다.
 *
 * - DB에서 오늘 경기 조회 후 Map으로 인덱싱
 * - 각 경기를 upsert (is_notified_* 필드 제외하여 덮어쓰기 방지, per D-06)
 * - 상태가 변경된 경기를 StateTransition[]으로 반환 (DATA-02)
 * - onConflict: game_date,home_team,away_team (복합 unique 제약, RESEARCH Open Question 1)
 */
export async function syncGames(crawledGames: CrawlerGame[]): Promise<StateTransition[]> {
  if (crawledGames.length === 0) {
    return []
  }

  const supabase = await createServerSupabaseClient()
  const today = getTodayKst()

  // DB에서 오늘 경기 조회
  const { data: dbGames, error: selectError } = await supabase
    .from('kbo_games')
    .select('*')
    .eq('game_date', today)

  if (selectError) {
    logger.error({ err: selectError }, 'syncGames: DB 조회 실패')
    throw new Error(`syncGames DB 조회 실패: ${selectError.message}`)
  }

  // home_team_away_team 키로 기존 경기 맵 구성
  const existingGamesMap = new Map<string, Game>()
  for (const game of (dbGames ?? []) as Game[]) {
    const key = `${game.home_team}_${game.away_team}`
    existingGamesMap.set(key, game)
  }

  const transitions: StateTransition[] = []

  for (const crawledGame of crawledGames) {
    const key = `${crawledGame.homeTeam}_${crawledGame.awayTeam}`
    const existingGame = existingGamesMap.get(key)

    // upsert 페이로드 — is_notified_* 필드 제외 (기존 알림 플래그 덮어쓰기 방지)
    const payload: Record<string, unknown> = {
      game_date: crawledGame.gameDate,
      home_team: crawledGame.homeTeam,
      away_team: crawledGame.awayTeam,
      status: crawledGame.status,
      home_score: crawledGame.homeScore,
      away_score: crawledGame.awayScore,
      inning_data: null,
      started_at: crawledGame.status === 'playing' ? new Date().toISOString() : null,
      finished_at: crawledGame.status === 'finished' ? new Date().toISOString() : null,
    }

    const { error: upsertError } = await supabase
      .from('kbo_games')
      .upsert(payload, { onConflict: 'game_date,home_team,away_team' })

    if (upsertError) {
      logger.error({ err: upsertError, game: crawledGame }, 'syncGames: upsert 실패')
      continue
    }

    // 상태 전이 감지: 기존 경기가 있고 상태가 변경되었을 때만
    if (existingGame && existingGame.status !== crawledGame.status) {
      transitions.push({
        gameId: existingGame.id,
        kboGameId: crawledGame.kboGameId,
        fromStatus: existingGame.status,
        toStatus: crawledGame.status,
        game: crawledGame,
      })
    }
  }

  return transitions
}

/**
 * 시즌 과거 데이터 백필 전용 upsert.
 *
 * syncGames와의 차이:
 *   - 상태 전이를 감지하지 않음(StateTransition 미반환) → 푸시 발송 0건
 *   - started_at / finished_at을 NOW가 아니라 game_date 기반으로 파생
 *     (lastGame 정렬용 finished_at이 NOW로 몰리면 시간 순이 깨지므로)
 *
 * 호출부는 보통 admin 엔드포인트(`/api/admin/backfill-season`)에서 일자 루프를 돈다.
 * KBO 사이트 부하를 고려해 호출부에서 적절한 간격을 둔다.
 */
export async function backfillGames(crawledGames: CrawlerGame[]): Promise<number> {
  if (crawledGames.length === 0) return 0

  const supabase = await createServerSupabaseClient()
  let upsertedCount = 0

  for (const crawledGame of crawledGames) {
    // game_date(YYYY-MM-DD) + startTime("HH:mm") 조합으로 KST started_at 구성
    // startTime이 비어있으면 null 유지
    const startedAt =
      crawledGame.startTime && /^\d{2}:\d{2}$/.test(crawledGame.startTime)
        ? `${crawledGame.gameDate}T${crawledGame.startTime}:00+09:00`
        : null

    // finished_at은 같은 날 22:00 KST로 고정(정렬 일관성 확보용 — 분초 단위 정확도 불필요)
    const finishedAt =
      crawledGame.status === 'finished'
        ? `${crawledGame.gameDate}T22:00:00+09:00`
        : null

    const payload: Record<string, unknown> = {
      game_date: crawledGame.gameDate,
      home_team: crawledGame.homeTeam,
      away_team: crawledGame.awayTeam,
      status: crawledGame.status,
      home_score: crawledGame.homeScore,
      away_score: crawledGame.awayScore,
      inning_data: null,
      started_at: startedAt,
      finished_at: finishedAt,
    }

    const { error: upsertError } = await supabase
      .from('kbo_games')
      .upsert(payload, { onConflict: 'game_date,home_team,away_team' })

    if (upsertError) {
      logger.error(
        { err: upsertError, game: crawledGame },
        'backfillGames: upsert 실패',
      )
      continue
    }

    upsertedCount += 1
  }

  return upsertedCount
}
