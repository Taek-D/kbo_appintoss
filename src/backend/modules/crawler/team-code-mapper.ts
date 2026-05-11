/**
 * kbo-game 패키지가 반환하는 팀 이름(한글/영문 약어 혼재)을
 * 시스템 내부 영문 2글자 TeamCode로 정규화한다.
 *
 * - 미니앱 TeamCode 컨벤션(`miniapp/src/lib/teams.ts`)과 1:1 매칭
 * - 응원팀 저장(`kbo_users.team_code`), 시즌 위젯 API, 푸시 발송 모두
 *   동일한 영문 코드를 사용해야 매칭이 성립한다.
 * - SK 코드는 SSG 랜더스를 의미 — historical 이유로 SK 유지
 *   (CLAUDE.md / miniapp teams.ts 주석 참조)
 */

export const TEAM_CODES = ['HH', 'OB', 'LG', 'KT', 'SS', 'NC', 'SK', 'LT', 'WO', 'KI'] as const
export type TeamCode = (typeof TEAM_CODES)[number]

const TEAM_CODE_SET: ReadonlySet<string> = new Set(TEAM_CODES)

/**
 * kbo-game 패키지 → 시스템 TeamCode 매핑.
 * 한글 풀네임, 한글 약어, 영문 약어 모두 인입 가능성 있어 모두 지원.
 */
const RAW_TO_CODE: ReadonlyMap<string, TeamCode> = new Map<string, TeamCode>([
  // 한글 약어
  ['두산', 'OB'],
  ['롯데', 'LT'],
  ['삼성', 'SS'],
  ['키움', 'WO'],
  ['한화', 'HH'],
  // 영문 약어 (DB에 KIA/SSG로 저장된 케이스)
  ['KIA', 'KI'],
  ['SSG', 'SK'],
  // 동일 코드 (no-op이지만 명시적 매핑으로 안전성 확보)
  ['KT', 'KT'],
  ['LG', 'LG'],
  ['NC', 'NC'],
  // 한글 풀네임 (kbo-game 패키지 잠재적 변형)
  ['KIA 타이거즈', 'KI'],
  ['KT 위즈', 'KT'],
  ['LG 트윈스', 'LG'],
  ['NC 다이노스', 'NC'],
  ['SSG 랜더스', 'SK'],
  ['두산 베어스', 'OB'],
  ['롯데 자이언츠', 'LT'],
  ['삼성 라이온즈', 'SS'],
  ['키움 히어로즈', 'WO'],
  ['한화 이글스', 'HH'],
])

/**
 * 입력값을 TeamCode로 정규화한다.
 * - 이미 영문 코드면 그대로 반환
 * - 매핑 가능한 한글/약어면 변환
 * - 매핑 불가면 null (호출부에서 에러 처리)
 */
export function normalizeTeamCode(raw: string): TeamCode | null {
  const trimmed = raw.trim()
  if (TEAM_CODE_SET.has(trimmed)) return trimmed as TeamCode
  return RAW_TO_CODE.get(trimmed) ?? null
}

/**
 * 정규화 실패 시 throw하는 strict 버전.
 * crawler가 알 수 없는 팀 이름을 silently DB에 저장하는 사고를 막는다.
 */
export function normalizeTeamCodeStrict(raw: string): TeamCode {
  const code = normalizeTeamCode(raw)
  if (code === null) {
    throw new Error(`Unknown team name: "${raw}". 매핑 테이블에 추가가 필요합니다.`)
  }
  return code
}
