/**
 * F014: 응원팀 시즌 위젯 훅.
 *
 * GET /api/teams/:teamCode/widget을 React Query 5분 staleTime으로 캐시한다.
 * teamCode가 null이면 enabled=false로 쿼리를 막는다 (응원팀 미선택).
 */

import { useQuery } from "@tanstack/react-query";
import { fetchTeamWidget, type TeamWidget } from "../lib/team-widget";

export const TEAM_WIDGET_QUERY_KEY = (teamCode: string | null) =>
  ["teams", teamCode, "widget"] as const;

type UseTeamWidgetResult = {
  widget: TeamWidget | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useTeamWidget(teamCode: string | null): UseTeamWidgetResult {
  const query = useQuery({
    queryKey: TEAM_WIDGET_QUERY_KEY(teamCode),
    // enabled가 false면 React Query가 queryFn을 호출하지 않으므로
    // 여기서 teamCode는 항상 string이다.
    queryFn: () => fetchTeamWidget(teamCode as string),
    enabled: teamCode !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const error = query.error instanceof Error ? query.error.message : null;

  return {
    widget: query.data ?? null,
    isLoading: query.isFetching && query.data === undefined,
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
