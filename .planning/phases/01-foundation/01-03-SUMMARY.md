---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [react, next.js, tailwind, onboarding, toss-style, client-components]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js 스캐폴딩, 공유 타입(TeamCode, KBO_TEAMS, User), Tailwind CSS"
  - phase: 01-02
    provides: "API Routes (POST /api/auth/login, GET /api/auth/me, PUT/DELETE /api/subscription)"
provides:
  - "온보딩 UI: 로그인 화면 (토스 로그인 버튼 + 한 줄 설명)"
  - "응원팀 선택 화면: 5x2 그리드 + 확인 모달"
  - "메인 화면: 응원팀 표시 + 오늘 경기 없음 안내"
  - "구독 관리: 응원팀 변경/해제 드롭다운 + 해제 확인 모달"
  - "공유 컴포넌트: ConfirmModal, TeamGrid, SubscriptionControl"
  - "토스 SDK 래퍼: callAppLogin() (개발/프로덕션 환경 분기)"
  - "인증 가드 레이아웃: 미인증 시 /login, team_code null 시 /team-select 리다이렉트"
affects: [02-01, 03-01, 04-01]

# Tech tracking
tech-stack:
  added: []
  patterns: [client-component-use-client, route-group-auth-main, auth-guard-layout, toss-sdk-wrapper, image-fallback-pattern]

key-files:
  created:
    - src/components/ConfirmModal.tsx
    - src/components/TeamGrid.tsx
    - src/components/SubscriptionControl.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(main)/team-select/page.tsx
    - src/app/(main)/page.tsx
    - src/app/(main)/layout.tsx
    - src/lib/toss-sdk.ts
  modified:
    - src/app/page.tsx (deleted - replaced by (main)/page.tsx)

key-decisions:
  - "토스 SDK는 window 글로벌 접근 래퍼로 구현 (npm 패키지 의존성 없이)"
  - "Route Group 패턴: (auth)는 인증 전, (main)은 인증 후 화면 분리"
  - "인증 가드를 (main)/layout.tsx 클라이언트 컴포넌트로 구현"

patterns-established:
  - "Client component: 'use client' 지시어로 인터랙티브 컴포넌트 구분"
  - "Route groups: (auth)/(main) 라우트 그룹으로 인증 상태별 레이아웃 분리"
  - "Image fallback: next/image onError 시 텍스트 코드로 대체"
  - "Toss SDK wrapper: src/lib/toss-sdk.ts에서 환경별 분기 처리"
  - "Auth guard layout: 레이아웃에서 /api/auth/me 호출하여 인증 상태 확인"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, SUB-01, SUB-02]

# Metrics
duration: 6min
completed: 2026-04-05
---

# Phase 1 Plan 03: Onboarding UI + Main Screen Summary

**토스 스타일 온보딩 UI(로그인 + 5x2 팀 선택 그리드) + 메인 화면(응원팀 표시 + 경기 없음 안내) + 구독 변경/해제 UX 전체 플로우**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-05T04:08:30Z
- **Completed:** 2026-04-05T04:14:38Z
- **Tasks:** 3 of 3 (Task 3 auto-approved)
- **Files created:** 9

## Accomplishments
- 전체 온보딩 플로우 UI 완성: 로그인 -> 팀 선택 -> 메인 화면
- 재사용 가능한 공유 컴포넌트: ConfirmModal, TeamGrid, SubscriptionControl
- 인증 가드 레이아웃: 미인증/미온보딩 유저 자동 리다이렉트
- 구독 관리 UX: 응원팀 변경(팀 선택 재사용) + 알림 해제(확인 모달)
- "오늘 경기 없음" 안내 화면 (Phase 2에서 실제 데이터로 교체 예정)
- 토스 디자인 스타일 적용: 화이트 배경, 둥근 모서리, 토스 블루(#0064FF)
- pnpm build 성공 (SSR 에러 없음)

## Task Commits

Each task was committed atomically:

1. **Task 1: 로그인 화면 + 응원팀 선택 화면 + 공유 컴포넌트** - `29f6bf3` (feat)
2. **Task 2: 메인 화면 + 구독 관리 + 인증 가드 레이아웃** - `fd3ce1c` (feat)
3. **Task 3: 전체 온보딩 플로우 시각 검증** - auto-approved (auto_advance: true)

## Files Created/Modified
- `src/components/ConfirmModal.tsx` - 재사용 확인 모달 (응원팀 확인 + 구독 해제에 공용)
- `src/components/TeamGrid.tsx` - 10개 구단 5x2 그리드 (이미지 fallback 처리)
- `src/components/SubscriptionControl.tsx` - 구독 관리 (응원팀 표시 + 변경/해제 드롭다운)
- `src/app/(auth)/login/page.tsx` - 토스 로그인 화면 (버튼 + 한 줄 설명)
- `src/app/(auth)/layout.tsx` - Auth 라우트 그룹 레이아웃
- `src/app/(main)/team-select/page.tsx` - 응원팀 선택 (5x2 그리드 + 확인 모달)
- `src/app/(main)/page.tsx` - 메인 화면 (응원팀 + 오늘 경기 없음 안내)
- `src/app/(main)/layout.tsx` - 인증 가드 레이아웃 (401 -> /login, null team -> /team-select)
- `src/lib/toss-sdk.ts` - 토스 SDK 래퍼 (개발/프로덕션 환경 분기)
- `src/app/page.tsx` - 삭제 (main 라우트 그룹으로 대체)

## Decisions Made
- 토스 SDK는 window 글로벌 접근 래퍼(callAppLogin)로 구현 -- npm 패키지 의존성 없이 토스 WebView 환경 대응
- Route Group 패턴으로 (auth)/(main) 분리 -- 인증 상태별 레이아웃 차별화
- 인증 가드를 (main)/layout.tsx 클라이언트 컴포넌트로 구현 -- 서버 컴포넌트 쿠키 접근 복잡도 회피

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 토스 SDK import 경로 수정**
- **Found during:** Task 1 (로그인 화면)
- **Issue:** 계획에서 `@apps-in-toss/web-framework`의 appLogin() 참조했으나 해당 패키지 미설치/미존재
- **Fix:** `src/lib/toss-sdk.ts` 래퍼 생성하여 window.TossApp 글로벌 접근 + 개발환경 mock 분기
- **Files modified:** src/lib/toss-sdk.ts, src/app/(auth)/login/page.tsx
- **Verification:** pnpm typecheck 통과
- **Committed in:** 29f6bf3

**2. [Rule 3 - Blocking] root page.tsx와 (main)/page.tsx 라우트 충돌 해소**
- **Found during:** Task 2 (메인 화면)
- **Issue:** src/app/page.tsx와 src/app/(main)/page.tsx가 동일 / 라우트에 충돌
- **Fix:** 기존 root page.tsx 삭제, (main)/page.tsx가 / 라우트 담당
- **Files modified:** src/app/page.tsx (삭제)
- **Verification:** pnpm build 성공, 라우트 정상 매핑 확인
- **Committed in:** fd3ce1c

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 모두 계획 실행에 필수적인 수정. 범위 확장 없음.

## Issues Encountered
- .next 캐시에 삭제된 page.tsx 참조 잔존 -- rm -rf .next로 해결

## Known Stubs

**1. 오늘 경기 정보 영역 (src/app/(main)/page.tsx)**
- **Line:** 108-128 (TODO 주석 표시)
- **Reason:** Phase 2에서 games API 구현 후 교체 예정. 현재는 "오늘 경기 없음" 고정 표시.
- **Resolution plan:** Phase 2 (02-01) crawler 모듈 완성 후 실제 경기 데이터 연동

## Next Phase Readiness
- 전체 프론트엔드 플로우 완성: 로그인 -> 팀 선택 -> 메인 -> 변경/해제
- Phase 2에서 games API 연동 시 메인 화면의 "오늘 경기 없음" 영역만 교체하면 됨
- 공유 컴포넌트(ConfirmModal, TeamGrid)는 다른 화면에서 재사용 가능
- 토스 SDK 래퍼는 실제 토스 WebView 환경에서 검증 필요

## Self-Check: PASSED

- [x] All 9 files exist on disk
- [x] Commit 29f6bf3 verified (Task 1)
- [x] Commit fd3ce1c verified (Task 2)
- [x] pnpm typecheck passes
- [x] pnpm build succeeds

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
