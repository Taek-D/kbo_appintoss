/**
 * F007: 경기 공유 상태 관리 훅.
 *
 * shareGame() 호출의 비동기 상태를 단일 discriminated union으로 노출해
 * GameDetail.tsx에서 인라인 피드백 영역을 분기하기 쉽게 한다.
 *
 * 에러는 throw하지 않고 status.phase === "error"로 반영한다.
 * (alert/confirm 금지 규칙 — 인라인 표시만)
 */

import { useCallback, useRef, useState } from "react";
import type { Game } from "../lib/games";
import { shareGame, type ShareOutcome } from "../lib/toss-share";

export type ShareStatus =
  | { phase: "idle" }
  | { phase: "sharing" }
  | { phase: "done"; outcome: ShareOutcome }
  | { phase: "error"; message: string };

export function useShareGame() {
  const [status, setStatus] = useState<ShareStatus>({ phase: "idle" });
  const inFlight = useRef(false);

  const share = useCallback(async (game: Game): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus({ phase: "sharing" });
    try {
      const outcome = await shareGame(game);
      setStatus({ phase: "done", outcome });
    } catch (err) {
      const message =
        err instanceof Error && err.message.length > 0
          ? err.message
          : "공유 중에 문제가 발생했어요";
      setStatus({ phase: "error", message });
    } finally {
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus({ phase: "idle" });
  }, []);

  return { status, share, reset };
}
