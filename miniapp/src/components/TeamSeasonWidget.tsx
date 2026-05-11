/**
 * F014: 응원팀 시즌 위젯 카드.
 *
 * 표시 항목:
 *   - 응원팀 이름 + 순위 (응원팀 컬러 강조)
 *   - 시즌 누적 전적 (승/패/무) + 승률 + 게임차
 *   - 다음 경기 요약 (가장 가까운 scheduled)
 *
 * 디자인 토큰:
 *   - 응원팀 컬러는 순위 숫자 / 승수 숫자에만 적용 (배경 전체 ❌)
 *   - SURFACE_ELEVATED 카드 배경
 */

import { findTeamByRawCode } from "../lib/games";
import type { TeamWidget } from "../lib/team-widget";
import { formatGamesBehind, formatWinRate } from "../lib/team-widget";
import {
  BORDER_WEAK,
  KOREAN_STACK,
  SURFACE,
  SURFACE_ELEVATED,
  TEXT_MEDIUM,
  TEXT_STRONG,
  TEXT_WEAK,
} from "../lib/design-tokens";
import { type Team } from "../lib/teams";

function displayTeamName(raw: string): string {
  return findTeamByRawCode(raw)?.shortName ?? raw;
}

function formatNextGameTime(startedAt: string | null): string {
  if (startedAt === null) return "시간 미정";
  const d = new Date(startedAt);
  if (Number.isNaN(d.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(d);
}

type Props = {
  widget: TeamWidget;
  myTeam: Team;
};

export function TeamSeasonWidget({ widget, myTeam }: Props) {
  const { season, nextGame } = widget;
  const opponent =
    nextGame === null
      ? null
      : nextGame.isHome
        ? nextGame.away_team
        : nextGame.home_team;

  return (
    <section
      aria-label={`${myTeam.name} 시즌 요약`}
      className="flex flex-col gap-4 rounded-2xl px-5 py-5"
      style={{
        background: SURFACE_ELEVATED,
        border: `1px solid ${BORDER_WEAK}`,
        fontFamily: KOREAN_STACK,
      }}
    >
      {/* 상단: 팀명 + 순위 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[12px] font-medium" style={{ color: TEXT_WEAK }}>
            2026 시즌
          </span>
          <span
            className="truncate text-[17px] font-bold"
            style={{ color: TEXT_STRONG }}
          >
            {myTeam.name}
          </span>
        </div>
        <div className="flex items-baseline gap-1 tabular-nums">
          <span
            className="text-[28px] font-extrabold leading-none"
            style={{ color: myTeam.color }}
          >
            {season.rank}
          </span>
          <span
            className="text-[14px] font-semibold"
            style={{ color: TEXT_MEDIUM }}
          >
            위
          </span>
        </div>
      </div>

      {/* 가운데: 승/패/무 + 승률 */}
      <div
        className="flex items-stretch justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: SURFACE }}
      >
        <div className="flex flex-col">
          <span className="text-[11px]" style={{ color: TEXT_WEAK }}>
            전적
          </span>
          <div className="flex items-baseline gap-1 tabular-nums">
            <span
              className="text-[20px] font-bold"
              style={{ color: myTeam.color }}
            >
              {season.wins}
            </span>
            <span className="text-[13px]" style={{ color: TEXT_MEDIUM }}>
              승
            </span>
            <span
              className="text-[20px] font-bold"
              style={{ color: TEXT_STRONG }}
            >
              {season.losses}
            </span>
            <span className="text-[13px]" style={{ color: TEXT_MEDIUM }}>
              패
            </span>
            {season.draws > 0 && (
              <>
                <span
                  className="text-[20px] font-bold"
                  style={{ color: TEXT_STRONG }}
                >
                  {season.draws}
                </span>
                <span className="text-[13px]" style={{ color: TEXT_MEDIUM }}>
                  무
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px]" style={{ color: TEXT_WEAK }}>
            승률
          </span>
          <span
            className="text-[20px] font-bold tabular-nums"
            style={{ color: TEXT_STRONG }}
          >
            {formatWinRate(season.winRate)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px]" style={{ color: TEXT_WEAK }}>
            게임차
          </span>
          <span
            className="text-[20px] font-bold tabular-nums"
            style={{ color: TEXT_STRONG }}
          >
            {formatGamesBehind(season.gamesBehind, season.rank)}
          </span>
        </div>
      </div>

      {/* 하단: 다음 경기 */}
      {nextGame !== null && opponent !== null && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: SURFACE }}
        >
          <div className="flex flex-col">
            <span className="text-[11px]" style={{ color: TEXT_WEAK }}>
              다음 경기
            </span>
            <span
              className="text-[14px] font-semibold"
              style={{ color: TEXT_STRONG }}
            >
              vs {displayTeamName(opponent)}{" "}
              <span className="text-[12px]" style={{ color: TEXT_MEDIUM }}>
                ({nextGame.isHome ? "홈" : "원정"})
              </span>
            </span>
          </div>
          <span
            className="text-[13px] font-medium tabular-nums"
            style={{ color: TEXT_MEDIUM }}
          >
            {formatNextGameTime(nextGame.started_at)}
          </span>
        </div>
      )}
    </section>
  );
}
