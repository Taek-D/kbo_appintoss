/**
 * F005: 오늘 경기 리스트 + 경기 상세 클라이언트 레이어.
 *
 * 서버 엔드포인트 (상위 kbo_game Next.js, CORS는 F008 예정):
 *   GET /api/games/today → { games: Game[] }
 *   GET /api/games/:id   → { game: Game }
 *
 * 타입 컨벤션(CLAUDE.md):
 *   - enum 금지 → literal union
 *   - any 금지 → unknown + 타입 가드
 *   - Game 필드는 서버 public.games 테이블과 1:1 매핑되며,
 *     이 모듈을 수정할 때는 반드시 상위 kbo_game/src/types/game.ts와 동기화한다.
 *
 * 노트:
 *   - home_team / away_team은 서버에서 text 컬럼이라 TeamCode 전 범위가 아닐 수도 있다.
 *     (과거 경기 / 미등록 팀) → 안전 파서로 findTeam()의 fallback을 두고,
 *     미니앱 표시 레이어에서는 shortName만 쓴다.
 *   - 서버 status는 'live'가 아니라 'playing'임을 주의.
 */

import { apiFetch } from "./api-client";
import { KBO_TEAMS, type Team, type TeamCode } from "./teams";

export type GameStatus = "scheduled" | "playing" | "finished" | "cancelled";

export type Game = {
  id: string;
  game_date: string;
  home_team: string;
  away_team: string;
  status: GameStatus;
  home_score: number;
  away_score: number;
  inning_data: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
};

/**
 * 이닝별 점수 (F006).
 *
 * 서버 inning_data JSONB가 { innings: [...] } 모양으로 저장되며,
 * 현재 game-repository는 null로 upsert할 수 있으므로 null 가능성이 항상 있다.
 * parseInningData()로 안전 파싱 후 사용하라.
 */
export type InningScore = {
  inning: number;
  home: number;
  away: number;
};

type TodayGamesResponse = { games: Game[] };
type GameDetailResponse = { game: Game };

export async function fetchTodayGames(): Promise<Game[]> {
  const { games } = await apiFetch<TodayGamesResponse>("/api/games/today", {
    method: "GET",
  });
  return games;
}

export async function fetchGameDetail(gameId: string): Promise<Game> {
  const { game } = await apiFetch<GameDetailResponse>(`/api/games/${gameId}`, {
    method: "GET",
  });
  return game;
}

/**
 * 응원팀이 참여한 경기인지 여부.
 * teamCode === null(미선택)이면 항상 false.
 */
export function isMyTeamGame(game: Game, teamCode: string | null): boolean {
  if (teamCode === null) return false;
  return game.home_team === teamCode || game.away_team === teamCode;
}

/**
 * text 컬럼 → KBO_TEAMS 매칭. 미등록 코드면 null.
 * 표시 레이어에서 fallback("KIA" 등 raw 문자열) 결정에 사용.
 */
export function findTeamByRawCode(raw: string): Team | null {
  return KBO_TEAMS.find((team) => team.code === (raw as TeamCode)) ?? null;
}

/**
 * started_at ISO → "HH:mm" (Asia/Seoul 기준).
 * null이면 "시간 미정".
 * 노트: 브라우저 로케일이 Asia/Seoul이 아닐 수 있으므로 명시 옵션 사용.
 */
export function formatGameTime(startedAt: string | null): string {
  if (startedAt === null) return "시간 미정";
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

/**
 * 경기 상세 네비게이션이 가능한지 — finished 상태일 때만 허용.
 * 심사 규칙 "UI 기능 완결성": 탭해도 반응 없는 버튼 금지 → 진행 중/예정/취소 경기는 onClick 없음.
 */
export function isGameDetailAvailable(game: Game): boolean {
  return game.status === "finished";
}

/**
 * inning_data JSONB → InningScore[] 안전 파서 (F006).
 *
 * 서버 저장 구조: { innings: [{ inning, home, away }, ...] }
 * null/형식 불일치/부분 누락 시 전부 빈 배열로 graceful fallback.
 * any 금지 (CLAUDE.md) → unknown + 타입 가드.
 *
 * kbo_game/src/types/game.ts의 parseInningData와 동일 규약.
 */
export function parseInningData(
  raw: Record<string, unknown> | null,
): InningScore[] {
  if (raw === null) return [];
  const innings = raw["innings"];
  if (!Array.isArray(innings)) return [];
  return innings
    .filter(
      (item: unknown): item is { inning: number; home: number; away: number } => {
        if (typeof item !== "object" || item === null) return false;
        const obj = item as Record<string, unknown>;
        return (
          typeof obj["inning"] === "number" &&
          typeof obj["home"] === "number" &&
          typeof obj["away"] === "number"
        );
      },
    )
    .map(({ inning, home, away }) => ({ inning, home, away }));
}

/**
 * "YYYY-MM-DD" → "M월 D일 (요일)" (Asia/Seoul 기준).
 * 경기 상세 헤더에 표시한다. 잘못된 값이면 원본 그대로 반환.
 */
export function formatGameDate(gameDate: string): string {
  const date = new Date(`${gameDate}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return gameDate;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}
