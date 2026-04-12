/**
 * F005: 오늘의 KBO 경기 목록 훅.
 *
 * React Query 기반으로 GET /api/games/today를 1분 stale로 캐시한다.
 * - 로그인 여부와 무관하게 조회 가능(서버에서 game 목록은 공개 데이터).
 * - 에러는 컴포넌트가 인라인으로 노출(alert/confirm/prompt 금지 규칙).
 * - 실시간 갱신은 F005 범위 밖 → 사용자 액션(pull-to-refresh 등)은 후속 패스에서.
 *
 * F008 이후:
 *   - 포커스 복귀 시 재조회 / 타임아웃 / 재시도 설정 확장
 *   - 'playing' 상태 game이 있을 때만 짧은 refetchInterval 적용
 */

import { useQuery } from "@tanstack/react-query";
import { fetchTodayGames, type Game } from "../lib/games";

export const TODAY_GAMES_QUERY_KEY = ["games", "today"] as const;

type UseTodayGamesResult = {
  games: Game[];
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  refetch: () => void;
};

export function useTodayGames(): UseTodayGamesResult {
  const query = useQuery({
    queryKey: TODAY_GAMES_QUERY_KEY,
    queryFn: fetchTodayGames,
    staleTime: 60_000,
    retry: false,
  });

  const error =
    query.error instanceof Error ? query.error.message : null;

  return {
    games: query.data ?? [],
    isLoading: query.isPending,
    isRefetching: query.isFetching && !query.isPending,
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
