/**
 * F014: 응원팀 시즌 위젯 클라이언트 레이어.
 *
 * 서버 엔드포인트: GET /api/teams/:teamCode/widget → TeamWidget
 * 서버 타입은 kbo_game/src/types/season.ts와 1:1 매핑.
 */

import { apiFetch } from "./api-client";

export type SeasonStats = {
  year: number;
  wins: number;
  losses: number;
  draws: number;
  /** 무승부 제외 승률. 분모 0이면 0. */
  winRate: number;
  /** 1-base 순위. 동률이면 동일 rank. */
  rank: number;
  /** 1위와의 게임차. 1위면 0. */
  gamesBehind: number;
};

export type NextGameSummary = {
  id: string;
  game_date: string;
  home_team: string;
  away_team: string;
  /** 경기 시작 ISO. null이면 시간 미정. */
  started_at: string | null;
  isHome: boolean;
  /** 응원팀 다음 경기 시작까지 밀리초. started_at이 null이면 null. */
  msUntilStart: number | null;
};

export type LastGameSummary = {
  id: string;
  game_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  /** 무승부면 null, 이외엔 응원팀 승/패 여부. */
  myTeamWon: boolean | null;
};

export type TeamWidget = {
  season: SeasonStats;
  nextGame: NextGameSummary | null;
  lastGame: LastGameSummary | null;
};

export async function fetchTeamWidget(teamCode: string): Promise<TeamWidget> {
  return apiFetch<TeamWidget>(`/api/teams/${encodeURIComponent(teamCode)}/widget`, {
    method: "GET",
  });
}

/**
 * 승률을 ".542" 형태로 포맷한다 (KBO 관습).
 */
export function formatWinRate(winRate: number): string {
  // 1.000을 1로 표시하지 않고 ".000"이 아닌 "1.000"으로 둔다
  if (winRate >= 1) return "1.000";
  return winRate.toFixed(3).replace(/^0/, "");
}

/**
 * 게임차를 표시한다. 1위는 "—"로 표시.
 */
export function formatGamesBehind(gamesBehind: number, rank: number): string {
  if (rank === 1 || gamesBehind === 0) return "—";
  // 0.5 단위로 출력 (정수면 정수, 반올림 단위는 KBO 관습)
  return gamesBehind % 1 === 0 ? `${gamesBehind}` : gamesBehind.toFixed(1);
}

/**
 * msUntilStart를 "Xh Ym" 또는 "곧" 등으로 변환한다.
 * null이면 "시간 미정".
 *
 * - 60초 미만: "곧 시작"
 * - 1시간 미만: "X분"
 * - 24시간 미만: "X시간 Y분"
 * - 이상: "D일 H시간"
 */
export function formatCountdown(msUntilStart: number | null): string {
  if (msUntilStart === null) return "시간 미정";
  if (msUntilStart <= 60_000) return "곧 시작";

  const totalMinutes = Math.floor(msUntilStart / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}
