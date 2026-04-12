/**
 * F006: 단일 경기 상세 훅.
 *
 * React Query로 GET /api/games/:id를 staleTime 5분으로 캐시한다.
 * - finished 상태의 경기만 상세 화면에 도달하므로 자동 refetch 불필요.
 * - gameId가 빈 문자열이면 disabled (잘못된 라우트 파라미터 방어).
 * - 에러는 컴포넌트가 인라인으로 노출 (alert/confirm/prompt 금지 규칙).
 */

import { useQuery } from "@tanstack/react-query";
import { fetchGameDetail, type Game } from "../lib/games";

export const GAME_DETAIL_QUERY_KEY = ["games", "detail"] as const;

type UseGameDetailResult = {
  game: Game | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useGameDetail(gameId: string): UseGameDetailResult {
  const query = useQuery({
    queryKey: [...GAME_DETAIL_QUERY_KEY, gameId] as const,
    queryFn: () => fetchGameDetail(gameId),
    enabled: gameId !== "",
    staleTime: 5 * 60_000,
    retry: false,
  });

  const error = query.error instanceof Error ? query.error.message : null;

  return {
    game: query.data ?? null,
    isLoading: query.isPending && gameId !== "",
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
