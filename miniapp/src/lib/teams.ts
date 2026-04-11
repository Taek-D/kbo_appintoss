/**
 * KBO 10구단 상수 (F004).
 *
 * team_code는 kbo_game 서버 Zod 스키마와 반드시 일치해야 한다:
 *   src/app/api/subscription/route.ts UpdateTeamRequestSchema
 *   z.enum(['HH', 'OB', 'LG', 'KT', 'SS', 'NC', 'SK', 'LT', 'WO', 'KI'])
 *
 * 노트:
 * - CLAUDE.md 타입 컨벤션: enum 금지 → literal union 사용
 * - 이모지/이니셜은 출시 전 공식 로고 이미지로 교체 예정 (F010 또는 별도 패스)
 * - 정렬: 한국어 가나다 순 (사용자 친숙도)
 * - SK 코드는 SSG 랜더스를 의미 — 서버 스키마가 historical 이유로 SK를 유지
 */

export type TeamCode =
  | "HH"
  | "OB"
  | "LG"
  | "KT"
  | "SS"
  | "NC"
  | "SK"
  | "LT"
  | "WO"
  | "KI";

export type Team = {
  code: TeamCode;
  name: string;
  shortName: string;
  color: string;
  emoji: string;
};

export const KBO_TEAMS: readonly Team[] = [
  { code: "KI", name: "KIA 타이거즈", shortName: "KIA", color: "#EA0029", emoji: "🐯" },
  { code: "KT", name: "KT 위즈", shortName: "KT", color: "#1A1A1A", emoji: "🧙" },
  { code: "LG", name: "LG 트윈스", shortName: "LG", color: "#C30452", emoji: "👯" },
  { code: "NC", name: "NC 다이노스", shortName: "NC", color: "#315288", emoji: "🦖" },
  { code: "SK", name: "SSG 랜더스", shortName: "SSG", color: "#CE0E2D", emoji: "🚀" },
  { code: "OB", name: "두산 베어스", shortName: "두산", color: "#131230", emoji: "🐻" },
  { code: "LT", name: "롯데 자이언츠", shortName: "롯데", color: "#002955", emoji: "🗽" },
  { code: "SS", name: "삼성 라이온즈", shortName: "삼성", color: "#074CA1", emoji: "🦁" },
  { code: "WO", name: "키움 히어로즈", shortName: "키움", color: "#570514", emoji: "🦸" },
  { code: "HH", name: "한화 이글스", shortName: "한화", color: "#FF6600", emoji: "🦅" },
] as const;

const TEAM_CODES = new Set<string>(KBO_TEAMS.map((team) => team.code));

export function isTeamCode(value: unknown): value is TeamCode {
  return typeof value === "string" && TEAM_CODES.has(value);
}

export function findTeam(code: TeamCode): Team {
  const team = KBO_TEAMS.find((t) => t.code === code);
  if (team === undefined) {
    // team_code 타입이 이미 좁혀져 있으므로 이론상 도달 불가 — 방어적 처리
    throw new Error(`알 수 없는 팀 코드: ${code}`);
  }
  return team;
}
