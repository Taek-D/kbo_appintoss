/**
 * KBO 팀 코드 - kbo-game@0.0.2 기준
 * CLAUDE.md: enum 절대 금지 -> 문자열 리터럴 유니온 사용
 */
export type TeamCode =
  | 'HH'  // 한화 이글스
  | 'OB'  // 두산 베어스
  | 'LG'  // LG 트윈스
  | 'KT'  // KT 위즈
  | 'SS'  // 삼성 라이온즈
  | 'NC'  // NC 다이노스
  | 'SK'  // SSG 랜더스
  | 'LT'  // 롯데 자이언츠
  | 'WO'  // 키움 히어로즈
  | 'KI'  // KIA 타이거즈

export const KBO_TEAMS: Array<{ code: TeamCode; name: string; logo: string }> = [
  { code: 'HH', name: '한화 이글스', logo: '/teams/HH.png' },
  { code: 'OB', name: '두산 베어스', logo: '/teams/OB.png' },
  { code: 'LG', name: 'LG 트윈스', logo: '/teams/LG.png' },
  { code: 'KT', name: 'KT 위즈', logo: '/teams/KT.png' },
  { code: 'SS', name: '삼성 라이온즈', logo: '/teams/SS.png' },
  { code: 'NC', name: 'NC 다이노스', logo: '/teams/NC.png' },
  { code: 'SK', name: 'SSG 랜더스', logo: '/teams/SK.png' },
  { code: 'LT', name: '롯데 자이언츠', logo: '/teams/LT.png' },
  { code: 'WO', name: '키움 히어로즈', logo: '/teams/WO.png' },
  { code: 'KI', name: 'KIA 타이거즈', logo: '/teams/KI.png' },
]

export type User = {
  id: string
  toss_user_key: string
  team_code: TeamCode | null
  subscribed: boolean
  /**
   * F013: 경기 종료 알림 수신 여부.
   * 실제 발송은 (subscribed AND notify_finish) 양쪽 모두 true일 때만 일어난다.
   */
  notify_finish: boolean
  /**
   * F013: 경기 취소 알림 수신 여부.
   * 실제 발송은 (subscribed AND notify_cancel) 양쪽 모두 true일 때만 일어난다.
   */
  notify_cancel: boolean
  created_at: string
  updated_at: string
}

/**
 * F013: 알림 종류별 선호 (PATCH /api/notification-preferences body).
 * 부분 갱신을 허용하므로 두 필드 모두 optional이지만, 최소 한 개는 반드시 포함되어야 한다.
 */
export type NotificationPreferences = {
  notify_finish?: boolean
  notify_cancel?: boolean
}
