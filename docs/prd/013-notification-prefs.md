# PRD-013: 알림 세분화 토글

> **상태:** Draft → In Progress
> **버전:** v1.1 (실제 코드베이스 반영)
> **작성일:** 2026-05-11
> **타깃 마일스톤:** F013
> **선행 의존:** 없음 (F013 → F014 권장 순서의 첫 번째)

## 1. 배경 & 문제 정의

### 1.1 현재 상태
- `kbo_users.subscribed` 1개 boolean으로 "전부 받음 / 전부 끔" 두 상태만 존재.
- 백엔드 `kbo_games` 테이블에는 이미 `is_notified_start/finish/cancel` 3개 플래그가 분리되어 있음.
- 하지만 실제 `notification-service.ts`는 **finish/cancel 2종만 발송** (`start`는 로직 미구현).
- 사용자가 "결과만 받고 싶음" / "우천 취소 알림은 필요 없음" 등의 세부 선호를 표현할 수 없음.

### 1.2 가설
> 사용자가 **finish/cancel 알림 종류를 개별 토글**할 수 있게 하면, 알림 마스터 OFF 전환율(이탈)이 줄고 평균 알림 클릭률이 올라간다.

### 1.3 v1.0 대비 변경
- ❌ `start` 토글 제외 — 백엔드 발송 로직이 없어 misleading.
- ✅ `finish` / `cancel` 2개로 MVP 축소. start는 F015+ 후보.

---

## 2. 사용자 스토리

| 페르소나 | 스토리 |
|---|---|
| **결과만 알고 싶은 직장인 (P0)** | "근무 중에는 알림이 거슬려요. 끝났을 때만 알려주세요." |
| **우천 시즌 사용자 (P0)** | "취소 알림은 안 받고 싶어요. 어차피 다음 경기 시간 알면 돼요." |
| **광팬 (P0)** | "둘 다 받을래요. 기본값이 두 개 다 ON이면 좋겠어요." |

---

## 3. 범위

### 3.1 In-Scope (F013)
1. `kbo_users` 테이블에 `notify_finish`, `notify_cancel` boolean 컬럼 추가
2. `/api/notification-preferences` PATCH 엔드포인트 신규
3. `/api/auth/me` 응답에 새 필드 포함
4. `notification-service.ts` 발송 시 `notify_X` 조건 필터링
5. miniapp `useAuth` 타입 확장 + mutation
6. Settings 페이지 UI: 알림 카드 1개 → 2개로 분할 + 마스터 스위치는 카드 그룹 헤더로

### 3.2 Out-of-Scope
- `start` 알림 토글 (백엔드 미구현 → F015+)
- 홈/원정 분리 토글 (F014+ 후보)
- 알림 시간대 제한

---

## 4. UX 사양

### 4.1 Settings 페이지 변경

```
┌─────────────────────────────┐
│ 설정                        │
│ 내 알리미                   │
├─────────────────────────────┤
│ 🐯 응원팀                   │
│ KIA 타이거즈      [ 변경 ] │
├─────────────────────────────┤
│ 🔔 알림                     │
│                             │
│ 경기 종료              [O]│  ← 기본 ON
│ 결과를 바로 알려드려요       │
│                             │
│ 경기 취소              [O]│  ← 기본 ON
│ 우천/사정으로 취소되면       │
│                             │
│ ─────────────────────────── │
│ 모든 알림 끄기  →           │  ← 마스터 스위치 텍스트 버튼
└─────────────────────────────┘
```

### 4.2 인터랙션 규칙
- 각 토글: **즉시 반영** (낙관적 업데이트, 실패 시 롤백 + 인라인 에러)
- 응원팀 미선택 시 알림 카드 전체 disabled + opacity 0.6
- 둘 다 OFF인데 마스터 ON 상태가 되면 안내 노출:
  "모든 알림이 꺼져 있어요. 끝난 경기는 홈에서 직접 확인할 수 있어요."
- 마스터 "모든 알림 끄기" → `subscribed=false`로 DELETE /api/subscription 호출 (기존 API 재사용)

### 4.3 마이크로카피
- 종료: **"경기 종료"** / 부제 "결과를 바로 알려드려요"
- 취소: **"경기 취소"** / 부제 "우천/사정으로 취소되면"

---

## 5. 데이터 모델

### 5.1 마이그레이션 — `20260512000000_user_notify_prefs.sql`
```sql
ALTER TABLE public.kbo_users ADD COLUMN notify_finish boolean NOT NULL DEFAULT true;
ALTER TABLE public.kbo_users ADD COLUMN notify_cancel boolean NOT NULL DEFAULT true;

-- 기존 subscribed=true 유저는 모두 디폴트값(true/true)로 마이그레이션 (변경 없음)
-- subscribed=false 유저도 디폴트값이지만, 실제 발송은 subscribed AND notify_X 양쪽 모두 true일 때만 일어남
```

### 5.2 발송 조건 (notification-service.ts)
```ts
// 구독자 조회 시 알림 종류별 필터 추가
const flagField = toStatus === 'finished' ? 'notify_finish' : 'notify_cancel'
const { data: users } = await supabase
  .from('kbo_users')
  .select('id, toss_user_key')
  .in('team_code', [homeTeam, awayTeam])
  .eq('subscribed', true)
  .eq(flagField, true)        // ← 추가
```

---

## 6. API 사양

### 6.1 GET `/api/auth/me` (응답 확장)
```json
{
  "user": {
    "id": "uuid",
    "team_code": "KI",
    "subscribed": true,
    "notify_finish": true,
    "notify_cancel": true
  }
}
```

### 6.2 PATCH `/api/notification-preferences` (신규)
```ts
// Request
{ "notify_finish"?: boolean, "notify_cancel"?: boolean }

// Response 200
{ "success": true, "user": AuthUser }

// 401: Unauthorized
// 400: Zod 검증 실패
// 200 (guest): 게스트는 인메모리 응답만 (저장 안 됨, 차후 토스 로그인 후 동기화)
```

**Validation (Zod):**
```ts
const NotifyPrefsSchema = z.object({
  notify_finish: z.boolean().optional(),
  notify_cancel: z.boolean().optional(),
}).refine(
  (data) => data.notify_finish !== undefined || data.notify_cancel !== undefined,
  "최소 한 개 필드를 보내야 합니다",
)
```

### 6.3 기존 `PUT/DELETE /api/subscription`
- 변경 없음. `subscribed`는 마스터 스위치로 계속 사용.
- `updateTeamCode()`가 `subscribed=true`로 갱신하는 동작도 유지.

---

## 7. 클라이언트 변경

### 7.1 `miniapp/src/hooks/useAuth.ts`
```ts
export interface AuthUser {
  id: string
  team_code: string | null
  subscribed: boolean
  notify_finish: boolean
  notify_cancel: boolean
}

// updateNotificationPrefsMutation 추가 — Optimistic Update + 롤백
```

### 7.2 `miniapp/src/pages/Settings.tsx`
- 기존 알림 카드 1개 → 토글 2개 카드 그룹
- 마스터 스위치는 카드 그룹 하단 "모든 알림 끄기" 텍스트 버튼

---

## 8. 측정 지표 (성공 정의)

| 지표 | 목표 (4주 후) |
|---|---|
| 알림 마스터 OFF 전환율 | **−30%** |
| 알림 클릭률 (CTR) | **+15%** |
| 평균 1인당 일일 알림 수 | **−10%** (좋은 방향) |

---

## 9. 에지 케이스

| 케이스 | 처리 |
|---|---|
| 응원팀 미선택 + 알림 토글 시도 | 알림 카드 전체 disabled |
| 둘 다 OFF인데 마스터 ON | 인라인 안내 (alert ❌) |
| 마스터 OFF 상태에서 종류 토글 변경 | 허용 (저장만 됨) |
| 네트워크 실패 | 낙관적 업데이트 롤백 + 인라인 에러 |
| 게스트 사용자 (`id === 'guest'`) | 인메모리 응답 (서버 저장 안 됨) |

---

## 10. NEVER/ALWAYS 체크

| 규칙 | 적용 |
|---|---|
| ❌ NEVER `alert/confirm/prompt` | ✅ 인라인 `role="alert"` |
| ❌ NEVER 커스텀 헤더 | ✅ 본문만 |
| ❌ NEVER 외부 링크 | ✅ 없음 |
| ✅ ALWAYS 즉시 반영 | ✅ Optimistic update |

---

## 11. 구현 단계 (분할 커밋)

| 단계 | 작업 | 추정 |
|---|---|---|
| 1 | DB 마이그레이션 + `types/user.ts` 갱신 | 0.5h |
| 2 | `user-repository.updateNotificationPrefs()` | 0.5h |
| 3 | `/api/notification-preferences` PATCH 엔드포인트 + Zod | 1h |
| 4 | `/api/auth/me` 응답 확장 | 0.5h |
| 5 | `notification-service.ts` 발송 조건 추가 | 0.5h |
| 6 | `useAuth.ts` 타입 + mutation | 1h |
| 7 | `Settings.tsx` UI 리팩터 | 2h |
| 8 | 통합 테스트 + lint + harness-validate | 1h |

**총 추정:** 7h (1일)
