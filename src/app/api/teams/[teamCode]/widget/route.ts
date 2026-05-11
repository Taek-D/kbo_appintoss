import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  computeAllTeamRanks,
  fetchLastGame,
  fetchNextGame,
  getCachedWidget,
  KBO_TEAM_CODES,
  setCachedWidget,
} from '@/backend/modules/season'
import { logger } from '@/lib/logger'
import { SEASON, type TeamWidget } from '@/types/season'

const TeamCodeSchema = z.enum(KBO_TEAM_CODES)

/**
 * F014: 응원팀 시즌 위젯 API.
 *
 * GET /api/teams/:teamCode/widget
 * Response 200: TeamWidget
 *
 * 캐싱: 서버 in-memory 5분 TTL (PRD-014 §6.2).
 *  - Vercel serverless 인스턴스 단위로 캐시되므로 cold start 시 무효화된다.
 *  - 트래픽 분산 가능성을 감안해 TTL을 짧게 유지 (5분이면 1쿼리/팀/5분 수준).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamCode: string }> },
) {
  const { teamCode: rawCode } = await params

  const parsed = TeamCodeSchema.safeParse(rawCode)
  if (!parsed.success) {
    return NextResponse.json({ error: '유효하지 않은 팀 코드입니다' }, { status: 400 })
  }
  const teamCode = parsed.data

  const cached = getCachedWidget(teamCode)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    // 3개 쿼리를 병렬 실행해 응답 지연을 최소화한다.
    const [rankMap, nextGame, lastGame] = await Promise.all([
      computeAllTeamRanks(),
      fetchNextGame(teamCode),
      fetchLastGame(teamCode),
    ])

    const teamRank = rankMap[teamCode]
    if (!teamRank) {
      logger.error({ teamCode }, 'teams/widget: rank 누락 (예상 외)')
      return NextResponse.json({ error: '시즌 통계를 계산할 수 없습니다' }, { status: 500 })
    }

    const widget: TeamWidget = {
      season: {
        year: SEASON.year,
        wins: teamRank.wins,
        losses: teamRank.losses,
        draws: teamRank.draws,
        winRate: teamRank.winRate,
        rank: teamRank.rank,
        gamesBehind: teamRank.gamesBehind,
      },
      nextGame,
      lastGame,
    }

    setCachedWidget(teamCode, widget)
    return NextResponse.json(widget)
  } catch (err: unknown) {
    logger.error({ err, teamCode }, 'teams/widget: 예상치 못한 오류')
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
