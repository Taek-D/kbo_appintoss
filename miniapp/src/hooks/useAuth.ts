import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { apiFetch, setAuthToken } from "../lib/api-client";
import type { TeamCode } from "../lib/teams";
import {
  registerUnlinkHandler,
  requestTossAppLogin,
  type TossAuthResult,
} from "../lib/toss-login";

/**
 * 서버(/api/auth/me, /api/auth/login) 응답과 동기화된 유저 타입.
 * F004에서 team_code는 응원팀 선택 후 갱신된다.
 */
export interface AuthUser {
  id: string;
  team_code: string | null;
  subscribed: boolean;
}

interface LoginResponse {
  success: true;
  user: AuthUser;
  token: string;
}

interface SubscriptionResponse {
  success: true;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

const AUTH_QUERY_KEY = ["auth", "me"] as const;

async function fetchMe(): Promise<AuthUser> {
  const { user } = await apiFetch<MeResponse>("/api/auth/me", {
    method: "GET",
  });
  return user;
}

async function postLogin(result: TossAuthResult): Promise<AuthUser> {
  const { user, token } = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      authorizationCode: result.authorizationCode,
      referrer: result.referrer === "SANDBOX" ? "sandbox" : "DEFAULT",
    }),
  });
  setAuthToken(token);
  return user;
}

async function putSubscription(teamCode: TeamCode): Promise<AuthUser> {
  const { user } = await apiFetch<SubscriptionResponse>("/api/subscription", {
    method: "PUT",
    body: JSON.stringify({ team_code: teamCode }),
  });
  return user;
}

async function deleteSubscription(): Promise<AuthUser> {
  const { user } = await apiFetch<SubscriptionResponse>("/api/subscription", {
    method: "DELETE",
  });
  return user;
}

/**
 * F003: 토스 로그인 훅.
 *
 * 플로우:
 *   1. login() 호출 → requestTossAppLogin() (동적 import + SDK safe)
 *   2. 응답받은 authorizationCode를 서버 /api/auth/login에 전달
 *   3. 서버가 쿠키 세션 발급 + user 반환
 *   4. React Query 캐시 갱신
 *
 * 상태:
 *   - user: 로그인된 유저 또는 null
 *   - isLoggedIn: 실제 유저(게스트 아님) 여부
 *   - isGuest: 서버 fallback 게스트 모드 여부
 *
 * me 쿼리는 enabled=false — Intro 진입 시 자동 조회로 인한 CORS 실패를 피한다.
 * F008에서 네트워크 레이어가 안정화되면 자동 조회로 전환한다.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    enabled: false,
    staleTime: 30_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const result = await requestTossAppLogin();
      return postLogin(result);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  /**
   * F004: 응원팀 저장 — PUT /api/subscription.
   * 성공 시 AUTH_QUERY_KEY 캐시의 user.team_code가 갱신된다.
   * 게스트 모드도 서버에서 fallback 처리되므로 로그인 여부 관계없이 호출 가능.
   */
  const selectTeamMutation = useMutation({
    mutationFn: (teamCode: TeamCode) => putSubscription(teamCode),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  /**
   * F011: 알림 구독 해제 — DELETE /api/subscription.
   * 성공 시 user.subscribed=false로 캐시 갱신.
   */
  const unsubscribeMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  const logout = useCallback(() => {
    // TODO(F003-followup): 서버 측 logout 엔드포인트 호출 (쿠키 제거)
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  // unlink 콜백 등록 — 현재는 구조만 (SDK API 확정 후 toss-login.ts에서 실제 등록)
  useEffect(() => {
    const cleanup = registerUnlinkHandler(() => {
      logout();
    });
    return cleanup;
  }, [logout]);

  const user = meQuery.data ?? null;
  const loginError =
    loginMutation.error instanceof Error ? loginMutation.error.message : null;
  const meError =
    meQuery.error instanceof Error ? meQuery.error.message : null;
  const selectTeamError =
    selectTeamMutation.error instanceof Error
      ? selectTeamMutation.error.message
      : null;
  const toggleSubscriptionError =
    unsubscribeMutation.error instanceof Error
      ? unsubscribeMutation.error.message
      : selectTeamError;

  /**
   * F011: 알림 구독 토글.
   * subscribe=true → 현재 팀으로 PUT (subscribed=true)
   * subscribe=false → DELETE (subscribed=false)
   */
  const toggleSubscription = useCallback(
    async (subscribe: boolean) => {
      if (subscribe) {
        if (!user?.team_code)
          throw new Error("응원팀을 먼저 선택해 주세요");
        await selectTeamMutation.mutateAsync(user.team_code as TeamCode);
      } else {
        await unsubscribeMutation.mutateAsync();
      }
    },
    [user, selectTeamMutation, unsubscribeMutation],
  );

  return {
    user,
    isLoggedIn: user !== null && user.id !== "guest",
    isGuest: user?.id === "guest",
    isLoading: loginMutation.isPending,
    error: loginError ?? meError,
    login: loginMutation.mutateAsync,
    logout,
    selectTeam: selectTeamMutation.mutateAsync,
    isSelectingTeam: selectTeamMutation.isPending,
    selectTeamError,
    toggleSubscription,
    isTogglingSubscription:
      unsubscribeMutation.isPending || selectTeamMutation.isPending,
    toggleSubscriptionError,
  };
}
