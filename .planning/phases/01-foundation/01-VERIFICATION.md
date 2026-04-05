---
phase: 01-foundation
verified: 2026-04-05T04:30:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "INFRA-02: 토스 Push 메시지 템플릿 검수 신청"
    expected: "앱인토스 콘솔에서 Push 메시지 템플릿 검수가 신청된 상태"
    why_human: "사용자가 외부 콘솔에서 직접 수행하는 작업. 코드에서 검증 불가. Plan 01-01 Task 2에서 SKIPPED 처리됨."
  - test: "전체 온보딩 플로우 시각 검증 (로그인 -> 팀 선택 -> 메인 -> 변경/해제)"
    expected: "토스 스타일 UI가 정상 렌더링되고 전체 플로우가 동작"
    why_human: "시각적 디자인 품질, 토스 스타일 일관성, 실제 유저 플로우 완결성은 프로그래밍적 검증 불가"
  - test: "토스 WebView 환경에서 실제 로그인 검증"
    expected: "토스 앱 내에서 callAppLogin() -> authCode -> 로그인 성공"
    why_human: "개발 환경에서는 mock authCode 사용. 실제 토스 WebView SDK 통합은 배포 후 검증 필요"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** 유저가 토스 로그인으로 진입하여 응원팀을 선택하고 구독할 수 있으며, 서비스의 모든 데이터 계약(DB 스키마)이 확립된다
**Verified:** 2026-04-05T04:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 유저는 토스 로그인 버튼을 눌러 별도 회원가입 없이 서비스에 진입할 수 있다 | VERIFIED | `src/app/(auth)/login/page.tsx` renders login button, calls `callAppLogin()` -> `POST /api/auth/login` -> `exchangeAuthCode` -> `getTossUserKey` -> `upsertUser` -> session cookie. Full chain wired. |
| 2 | 유저는 10개 KBO 구단 중 하나를 선택하여 응원팀으로 저장할 수 있다 | VERIFIED | `src/app/(main)/team-select/page.tsx` renders `TeamGrid` (5x2 grid of 10 teams from `KBO_TEAMS`), opens `ConfirmModal`, calls `PUT /api/subscription` -> `updateTeamCode()` sets `team_code` + `subscribed=true`. Zod validates TeamCode. |
| 3 | 유저가 앱을 재진입하면 이전에 선택한 응원팀이 그대로 표시된다 | VERIFIED | `src/app/(main)/layout.tsx` auth guard calls `GET /api/auth/me` -> `getTossUserKey` -> `getUserByTossKey` -> returns `team_code`. `src/app/(main)/page.tsx` fetches user and renders `SubscriptionControl` with team info. DB persistence via Supabase `users.team_code`. |
| 4 | 유저는 응원팀을 변경하거나 알림 구독을 해제할 수 있다 | VERIFIED | `SubscriptionControl.tsx` dropdown: "응원팀 변경" -> `/team-select?current=XX` (reuses team-select with highlight), "알림 끄기" -> `ConfirmModal` -> `DELETE /api/subscription` -> `updateSubscription(userId, false)`. |
| 5 | Supabase에 users, games, push_logs 테이블이 생성되고, 토스 Push 메시지 템플릿 검수가 신청된다 | VERIFIED (partial: human_needed for template) | DDL in `supabase/migrations/20260404000000_init_schema.sql`: `CREATE TABLE public.users`, `CREATE TABLE public.games`, `CREATE TABLE public.push_logs` + 3 indexes + 2 triggers. Template review (INFRA-02) was SKIPPED by user -- human action item pending. |

**Score:** 5/5 truths verified (1 has human-action dependency noted)

### Required Artifacts

**Plan 01 (Infrastructure):**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260404000000_init_schema.sql` | users, games, push_logs DDL + indexes + triggers | VERIFIED | 62 lines. 3 tables, 3 indexes, 2 triggers, FK constraints. Valid PostgreSQL DDL. |
| `src/types/user.ts` | TeamCode, KBO_TEAMS, User | VERIFIED | 38 lines. Exports `TeamCode` (10 string literals), `KBO_TEAMS` (10 entries with code/name/logo), `User` type. |
| `src/types/game.ts` | GameStatus, Game | VERIFIED | 22 lines. Exports `GameStatus` (4 literals), `Game` type matching DB schema. |
| `src/types/toss.ts` | TossAuthResponse, TossUserInfo | VERIFIED | 17 lines. Exports `TossReferrer`, `TossAuthResponse`, `TossUserInfo`. |
| `vitest.config.mts` | Vitest test config | VERIFIED | 16 lines. react plugin, jsdom, globals, setupFiles. |
| `src/lib/supabase/server.ts` | Server Supabase client | VERIFIED | 24 lines. Exports `createServerSupabaseClient` using `@supabase/ssr` `createServerClient` with cookies. |
| `src/lib/supabase/client.ts` | Browser Supabase client | VERIFIED | 9 lines. Exports `createBrowserSupabaseClient` using `@supabase/ssr` `createBrowserClient`. |
| `src/lib/logger.ts` | Pino logger | VERIFIED | 18 lines. Pino with dev pino-pretty transport. |
| `.env.example` | Environment variable template | VERIFIED | 5 keys: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TOSS_MTLS_CERT, TOSS_MTLS_KEY. |

**Plan 02 (Auth Module TDD):**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/backend/modules/auth/user-repository.ts` | Supabase users CRUD | VERIFIED | 106 lines. Exports `upsertUser`, `getUserByTossKey`, `updateTeamCode`, `updateSubscription`. Zod TeamCode validation. |
| `src/backend/modules/auth/toss-client.ts` | Toss mTLS API client | VERIFIED | 104 lines. Exports `exchangeAuthCode`, `getTossUserKey`. Zod response validation. No `as` assertions on external data. |
| `src/backend/modules/auth/index.ts` | Auth module public API | VERIFIED | 16 lines. Re-exports all 6 functions from user-repository and toss-client. |
| `src/app/api/auth/login/route.ts` | POST /api/auth/login | VERIFIED | 72 lines. Exports `POST`. Zod body validation, authCode->accessToken->userKey->upsert->session cookie chain. |
| `src/app/api/auth/me/route.ts` | GET /api/auth/me | VERIFIED | 46 lines. Exports `GET`. Session cookie -> userKey -> user lookup. 401/404/500 error handling. |
| `src/app/api/subscription/route.ts` | PUT + DELETE /api/subscription | VERIFIED | 93 lines. Exports `PUT` (team_code update + subscribed=true) and `DELETE` (subscribed=false). Zod TeamCode validation. |
| `src/backend/modules/auth/__tests__/user-repository.test.ts` | User repository tests | VERIFIED | File exists. Part of 17 passing tests. |
| `src/backend/modules/auth/__tests__/toss-client.test.ts` | Toss client tests | VERIFIED | File exists. Part of 17 passing tests. |

**Plan 03 (UI):**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(auth)/login/page.tsx` | Toss login page | VERIFIED | 85 lines. Login button (#0064FF), callAppLogin(), fetch POST /api/auth/login, router.push based on team_code. |
| `src/app/(main)/team-select/page.tsx` | Team select page | VERIFIED | 114 lines. TeamGrid + ConfirmModal, PUT /api/subscription, change mode via ?current= param. |
| `src/app/(main)/page.tsx` | Main page | VERIFIED | 157 lines. Fetch /api/auth/me, SubscriptionControl, "오늘 경기 없음" fallback UI, skeleton loading, error retry. |
| `src/components/TeamGrid.tsx` | 5x2 team grid | VERIFIED | 66 lines. Exports `TeamGrid`. grid-cols-5 grid-rows-2, Image with onError fallback, selected highlight. |
| `src/components/ConfirmModal.tsx` | Confirm modal | VERIFIED | 79 lines. Exports `ConfirmModal`. Backdrop click, ESC key, rounded-2xl, toss-style buttons. |
| `src/components/SubscriptionControl.tsx` | Subscription control | VERIFIED | 161 lines. Exports `SubscriptionControl`. Dropdown menu (변경/해제), ConfirmModal for unsubscribe, DELETE /api/subscription. |
| `src/app/(main)/layout.tsx` | Auth guard layout | VERIFIED | 65 lines. Fetch /api/auth/me, 401 -> /login, null team_code -> /team-select, spinner loading. |
| `src/lib/toss-sdk.ts` | Toss SDK wrapper | VERIFIED | 41 lines. Exports `callAppLogin`. Dev mock / prod window.TossApp split. |

### Key Link Verification

**Plan 01:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/supabase/server.ts` | `@supabase/ssr` | `createServerClient` import | WIRED | Line 1: `import { createServerClient } from '@supabase/ssr'` |
| `src/types/user.ts` | `supabase/migrations/...sql` | TeamCode literals match DB team_code column | WIRED | 10 TeamCode values correspond to DB text column. Schema uses TEXT for flexibility. |

**Plan 02:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `user-repository.ts` | `supabase/server.ts` | `createServerSupabaseClient` import | WIRED | Line 2: `import { createServerSupabaseClient } from '@/lib/supabase/server'` |
| `user-repository.ts` | `types/user.ts` | `TeamCode, User` import | WIRED | Line 4: `import type { TeamCode, User } from '@/types/user'` |
| `api/auth/login/route.ts` | `auth/index.ts` | `exchangeAuthCode, getTossUserKey, upsertUser` import | WIRED | Line 3: `import { exchangeAuthCode, getTossUserKey, upsertUser } from '@/backend/modules/auth'` |
| `api/subscription/route.ts` | `auth/index.ts` | `updateTeamCode, updateSubscription` import | WIRED | Line 8: `} from '@/backend/modules/auth'` (multi-line import) |

**Plan 03:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `login/page.tsx` | `/api/auth/login` | `fetch POST` | WIRED | Line 25: `fetch('/api/auth/login', { method: 'POST', ... })` |
| `team-select/page.tsx` | `/api/subscription` | `fetch PUT` | WIRED | Line 49: `fetch('/api/subscription', { method: 'PUT', ... })` |
| `SubscriptionControl.tsx` | `/api/subscription` | `fetch DELETE` | WIRED | Line 60-61: `fetch('/api/subscription', { method: 'DELETE' })` |
| `(main)/page.tsx` | `/api/auth/me` | `fetch GET` | WIRED | Line 26: `fetch('/api/auth/me')` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `(main)/page.tsx` | `user` (useState) | `fetch('/api/auth/me')` -> `setUser(userData.user)` | Yes - API calls `getTossUserKey` -> `getUserByTossKey` -> Supabase query | FLOWING |
| `team-select/page.tsx` | `KBO_TEAMS` (imported constant) | `src/types/user.ts` static array | Yes - 10 hardcoded team entries (by design, not a stub) | FLOWING |
| `SubscriptionControl.tsx` | `user` (prop from parent) | Parent `page.tsx` passes fetched user | Yes - traces back to Supabase query | FLOWING |
| `(main)/page.tsx` | Game info area | None (TODO for Phase 2) | No - static "오늘 경기 없음" text | STATIC (by design, Phase 2 scope) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Tests pass | `pnpm test --run` | 3 test files, 17 tests passed (1.20s) | PASS |
| TypeScript compiles | `pnpm typecheck` | Clean exit, no errors | PASS |
| Build succeeds | `pnpm build` | 7 routes generated, 0 errors | PASS |
| API routes registered | `pnpm build` output | `/api/auth/login`, `/api/auth/me`, `/api/subscription` all listed as dynamic routes | PASS |
| UI pages registered | `pnpm build` output | `/`, `/login`, `/team-select` all listed as static routes | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01 | Supabase에 users, games, push_logs 테이블이 구성된다 | SATISFIED | DDL migration file with 3 tables, 3 indexes, 2 triggers. |
| INFRA-02 | 01-01 | 토스 Push 메시지 템플릿이 검수를 통과한다 | NEEDS HUMAN | Task 2 of Plan 01-01 SKIPPED by user. Human action item -- not a code gap. |
| INFRA-03 | 01-01 | 경기 상태는 DB에 영속화되어 서버 재시작에도 유지된다 | PARTIAL | DB schema with `games.status` column established (Phase 1 scope). Actual persistence logic is Phase 2 (polling worker writes to DB). Foundation is in place. |
| AUTH-01 | 01-02, 01-03 | 유저는 토스 로그인으로 별도 회원가입 없이 서비스에 진입할 수 있다 | SATISFIED | Login page -> callAppLogin() -> POST /api/auth/login -> exchangeAuthCode -> upsertUser -> session cookie. TDD tested. |
| AUTH-02 | 01-02, 01-03 | 유저는 10개 KBO 구단 중 하나를 응원팀으로 선택할 수 있다 | SATISFIED | TeamGrid (10 teams, 5x2 grid) -> ConfirmModal -> PUT /api/subscription -> updateTeamCode (Zod validated) + subscribed=true. TDD tested. |
| AUTH-03 | 01-02, 01-03 | 유저는 재진입 시 기존 응원팀 설정이 유지된다 | SATISFIED | GET /api/auth/me -> getUserByTossKey -> returns saved team_code from DB. Auth guard layout fetches and renders. Supabase upsert with onConflict preserves existing record. TDD tested. |
| AUTH-04 | 01-02, 01-03 | 유저는 응원팀을 변경할 수 있다 | SATISFIED | SubscriptionControl "응원팀 변경" -> /team-select?current=XX -> PUT /api/subscription with new team_code -> updateTeamCode. TDD tested. |
| SUB-01 | 01-02, 01-03 | 유저는 알림 구독을 해제할 수 있다 | SATISFIED | SubscriptionControl "알림 끄기" -> ConfirmModal -> DELETE /api/subscription -> updateSubscription(userId, false). TDD tested. |
| SUB-02 | 01-03 | 유저의 응원팀에 오늘 경기가 없으면 "오늘 경기 없음" 화면이 표시된다 | SATISFIED | Main page displays "오늘은 {팀명} 경기가 없어요" with baseball icon. Phase 2 will replace with live data. Current static display fulfills the SUB-02 requirement for the "no game" case. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(main)/page.tsx` | 131 | TODO comment: Phase 2 games API placeholder | Info | Expected. Documented in Plan 03 known stubs. "오늘 경기 없음" is the correct Phase 1 behavior for SUB-02. Will be replaced when games API is built in Phase 2. |

No console.log usage found. No `enum` keyword used. No `any` type used. No placeholder/stub components. No empty implementations.

### Human Verification Required

### 1. Toss Push Template Review (INFRA-02)

**Test:** 앱인토스 콘솔(https://developers-apps-in-toss.toss.im)에서 Push 메시지 템플릿 검수 신청
**Expected:** 템플릿 등록 및 검수 신청 완료 상태
**Why human:** Plan 01-01 Task 2에서 사용자가 SKIP 선택. 외부 콘솔에서의 수동 작업. Phase 3 (Push Notification) 시작 전까지 완료 필요.

### 2. Visual Flow Verification

**Test:** pnpm dev -> http://localhost:3000/login 접속 -> mock 로그인 -> 팀 선택 -> 메인 화면 -> 응원팀 변경/해제 전체 플로우 확인
**Expected:** 토스 스타일 UI (화이트 배경, 둥근 모서리, #0064FF 블루) 일관 적용. 5x2 그리드 정상 렌더링. 모달/드롭다운 동작. 스켈레톤 로딩.
**Why human:** 시각적 디자인 품질, UX 완결성, 애니메이션/인터랙션 품질은 프로그래밍적 검증 불가.

### 3. Toss WebView SDK Integration

**Test:** 토스 앱 내에서 미니앱 실행 -> callAppLogin() 실행 -> 실제 OAuth2 로그인 플로우
**Expected:** window.TossApp.appLogin() 정상 동작, 실제 authCode 발급 및 로그인 성공
**Why human:** 개발 환경에서는 mock authCode 사용. 실제 토스 WebView 환경은 배포 후에만 검증 가능.

### Gaps Summary

자동화된 검증에서 발견된 코드 수준의 gap은 없습니다. 모든 아티팩트가 존재하고, 실체가 있으며, 올바르게 연결되어 있습니다. 17개 테스트 전부 통과, TypeScript 컴파일 정상, Next.js 빌드 성공.

**INFRA-02 (토스 Push 템플릿 검수)는 사용자가 의도적으로 SKIP한 human-action 항목**으로, 코드 gap이 아닙니다. Phase 3 시작 전까지 완료하면 됩니다.

**INFRA-03 (경기 상태 DB 영속화)는 DB 스키마가 Phase 1에서 확립**되었고, 실제 데이터 쓰기 로직은 Phase 2 (polling worker) 범위입니다. Phase 1의 기여분(스키마)은 완료.

메인 화면의 "오늘 경기 없음" 고정 표시는 Phase 2 games API 연동 전까지의 의도된 동작이며, SUB-02 요구사항("경기가 없으면 없음 표시")을 정확히 충족합니다.

---

_Verified: 2026-04-05T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
