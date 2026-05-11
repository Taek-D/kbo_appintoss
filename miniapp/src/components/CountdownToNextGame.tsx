/**
 * F014: 다음 경기까지 카운트다운.
 *
 * - 응원팀의 다음 scheduled 경기 started_at까지 남은 시간을 표시
 * - 1분마다 갱신 (PRD-014 §4.4 — 과도한 애니메이션 ❌)
 * - started_at이 null이면 "곧" 으로 표시
 */

import { useEffect, useState } from "react";
import type { NextGameSummary } from "../lib/team-widget";
import { formatCountdown } from "../lib/team-widget";
import {
  BORDER_WEAK,
  KOREAN_STACK,
  SURFACE_ELEVATED,
  TEXT_MEDIUM,
  TEXT_WEAK,
} from "../lib/design-tokens";
import type { Team } from "../lib/teams";

function computeMsUntilStart(startedAt: string | null): number | null {
  if (startedAt === null) return null;
  const t = new Date(startedAt).getTime();
  if (Number.isNaN(t)) return null;
  return t - Date.now();
}

type Props = {
  nextGame: NextGameSummary;
  myTeam: Team;
};

export function CountdownToNextGame({ nextGame, myTeam }: Props) {
  // tick 카운터는 단순 리렌더 트리거 — 실제 값은 매 렌더에 계산한다.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const label = formatCountdown(computeMsUntilStart(nextGame.started_at));

  return (
    <section
      aria-label="다음 경기까지 남은 시간"
      className="flex flex-col items-center gap-2 rounded-2xl px-5 py-6"
      style={{
        background: SURFACE_ELEVATED,
        border: `1px solid ${BORDER_WEAK}`,
        fontFamily: KOREAN_STACK,
      }}
    >
      <span className="text-[12px]" style={{ color: TEXT_WEAK }}>
        다음 경기까지
      </span>
      <span
        className="text-[28px] font-bold tabular-nums"
        style={{ color: myTeam.color }}
      >
        {label}
      </span>
      <span className="text-[12px]" style={{ color: TEXT_MEDIUM }}>
        {nextGame.isHome ? "홈경기" : "원정경기"}
      </span>
    </section>
  );
}
