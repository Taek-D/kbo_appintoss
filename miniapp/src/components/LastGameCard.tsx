/**
 * F014: 어제(가장 최근) 결과 카드.
 *
 * - 응원팀 시점의 승/패/무 라벨
 * - 탭하면 /game/:id 상세로 이동
 * - 점수, 상대팀명, 응원팀 컬러 강조
 */

import { findTeamByRawCode } from "../lib/games";
import type { LastGameSummary } from "../lib/team-widget";
import {
  BORDER_WEAK,
  KOREAN_STACK,
  SURFACE,
  SURFACE_ELEVATED,
  TEXT_MEDIUM,
  TEXT_STRONG,
  TEXT_WEAK,
} from "../lib/design-tokens";
import type { Team } from "../lib/teams";

function displayTeamName(raw: string): string {
  return findTeamByRawCode(raw)?.shortName ?? raw;
}

function formatGameDate(gameDate: string): string {
  const d = new Date(`${gameDate}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return gameDate;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}

type Props = {
  lastGame: LastGameSummary;
  myTeam: Team;
  onNavigate: (gameId: string) => void;
};

export function LastGameCard({ lastGame, myTeam, onNavigate }: Props) {
  const isHome = lastGame.home_team === myTeam.code;
  const myScore = isHome ? lastGame.home_score : lastGame.away_score;
  const oppScore = isHome ? lastGame.away_score : lastGame.home_score;
  const opponent = isHome ? lastGame.away_team : lastGame.home_team;

  const result: { label: string; color: string } =
    lastGame.myTeamWon === null
      ? { label: "무", color: TEXT_MEDIUM }
      : lastGame.myTeamWon
        ? { label: "승", color: myTeam.color }
        : { label: "패", color: TEXT_WEAK };

  const ariaLabel = `최근 경기, ${myTeam.shortName} ${myScore} 대 ${oppScore} ${displayTeamName(opponent)}, ${result.label}`;

  return (
    <button
      type="button"
      onClick={() => onNavigate(lastGame.id)}
      aria-label={ariaLabel}
      className="flex w-full flex-col gap-2 rounded-2xl px-5 py-4 text-left transition-colors active:bg-secondary"
      style={{
        background: SURFACE_ELEVATED,
        border: `1px solid ${BORDER_WEAK}`,
        fontFamily: KOREAN_STACK,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px]" style={{ color: TEXT_WEAK }}>
          {formatGameDate(lastGame.game_date)} · 결과
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            background: SURFACE,
            color: result.color,
            border: `1px solid ${BORDER_WEAK}`,
          }}
        >
          {result.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span
          className="flex-1 truncate text-[15px] font-semibold"
          style={{ color: TEXT_STRONG }}
        >
          {myTeam.shortName}
        </span>
        <div className="flex items-center gap-2 tabular-nums">
          <span
            className="text-[22px] font-bold"
            style={{ color: result.label === "승" ? myTeam.color : TEXT_STRONG }}
          >
            {myScore}
          </span>
          <span className="text-[15px]" style={{ color: TEXT_WEAK }}>
            :
          </span>
          <span
            className="text-[22px] font-bold"
            style={{ color: TEXT_STRONG }}
          >
            {oppScore}
          </span>
        </div>
        <span
          className="flex-1 truncate text-right text-[15px] font-semibold"
          style={{ color: TEXT_MEDIUM }}
        >
          {displayTeamName(opponent)}
        </span>
      </div>
    </button>
  );
}
