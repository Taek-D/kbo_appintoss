---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [toss-oauth, supabase, zod, tdd, vitest, next.js-api-routes]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js 스캐폴딩, 공유 타입(TeamCode, User, Toss), Supabase 클라이언트, Vitest 인프라, Pino 로거"
provides:
  - "Auth 모듈: user-repository (upsertUser, getUserByTossKey, updateTeamCode, updateSubscription)"
  - "Auth 모듈: toss-client (exchangeAuthCode, getTossUserKey) with Zod 검증"
  - "API Routes: POST /api/auth/login, GET /api/auth/me, PUT /api/subscription, DELETE /api/subscription"
  - "Auth TDD 테스트 스위트 (13개 케이스)"
affects: [01-03, 02-01, 02-02, 03-01, 04-01]

# Tech tracking
tech-stack:
  added: []
  patterns: [tdd-red-green-refactor, zod-runtime-validation, supabase-upsert-onconflict, session-cookie-auth, module-re-export-index]

key-files:
  created:
    - src/backend/modules/auth/user-repository.ts
    - src/backend/modules/auth/toss-client.ts
    - src/backend/modules/auth/index.ts
    - src/backend/modules/auth/__tests__/user-repository.test.ts
    - src/backend/modules/auth/__tests__/toss-client.test.ts
    - src/app/api/auth/login/route.ts
    - src/app/api/auth/me/route.ts
    - src/app/api/subscription/route.ts
  modified: []

key-decisions:
  - "Zod z.enum()으로 TeamCode 런타임 검증 (enum 금지 준수)"
  - "TossAuthResponse/TossUserInfo를 Zod safeParse로 검증 (as 타입 단언 최소화)"
  - "session_token을 httpOnly secure cookie로 저장 (accessToken 직접 저장)"

patterns-established:
  - "TDD RED-GREEN: 테스트 먼저 작성 -> 구현 -> 모두 통과 확인"
  - "Zod runtime validation: 외부 입력(토스 API 응답, 요청 body)은 반드시 Zod로 검증"
  - "Module re-export: auth/index.ts에서 모든 public API를 re-export"
  - "API Route error handling: try/catch + 적절한 HTTP 상태 코드 + logger.error"
  - "Session extraction helper: extractUserId()로 쿠키 -> userKey -> userId 추출 패턴"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, SUB-01]

# Metrics
duration: 5min
completed: 2026-04-05
---

# Phase 1 Plan 02: Auth Module TDD Summary

**토스 OAuth2 로그인(authCode->accessToken->userKey) + 유저 CRUD + 응원팀 구독/해제 API를 TDD로 구현, Zod 런타임 검증 적용**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-05T03:58:08Z
- **Completed:** 2026-04-05T04:03:11Z
- **Tasks:** 2 of 2
- **Files created:** 8

## Accomplishments
- Auth 모듈 TDD 완료: RED(실패 테스트 13개) -> GREEN(구현 후 전부 통과)
- user-repository: Supabase upsert/select/update로 유저 CRUD (onConflict로 중복 방지)
- toss-client: 토스 OAuth2 토큰 교환 + 유저 정보 조회, Zod로 응답 스키마 검증
- 3개 API Route: login(인증+세션쿠키), me(현재유저조회), subscription(구독관리)
- TypeScript 타입 에러 없음 (pnpm typecheck 통과)
- 전체 17개 테스트 PASS

## Task Commits

Each task was committed atomically:

1. **Task 1: user-repository TDD + toss-client TDD**
   - `e444635` (test) - RED: 실패하는 테스트 작성
   - `91e6091` (feat) - GREEN: 구현 + 13개 테스트 통과
2. **Task 2: API Routes (login, me, subscription)** - `c45eec6` (feat)

## Files Created/Modified
- `src/backend/modules/auth/user-repository.ts` - Supabase users 테이블 CRUD (upsert, getByTossKey, updateTeamCode, updateSubscription)
- `src/backend/modules/auth/toss-client.ts` - 토스 mTLS API 클라이언트 (authCode 교환, userKey 조회), Zod 스키마 검증
- `src/backend/modules/auth/index.ts` - Auth 모듈 public API re-export
- `src/backend/modules/auth/__tests__/user-repository.test.ts` - user-repository 9개 테스트 (upsert/get/updateTeam/updateSub)
- `src/backend/modules/auth/__tests__/toss-client.test.ts` - toss-client 4개 테스트 (exchangeAuth/getUserKey)
- `src/app/api/auth/login/route.ts` - POST /api/auth/login (authCode -> session cookie)
- `src/app/api/auth/me/route.ts` - GET /api/auth/me (session -> 유저 정보)
- `src/app/api/subscription/route.ts` - PUT (응원팀 설정) + DELETE (구독 해제)

## Decisions Made
- Zod z.enum()으로 TeamCode 런타임 검증 -- CLAUDE.md enum 금지 규칙 준수하면서 런타임 안전성 확보
- TossAuthResponse/TossUserInfo Zod safeParse 검증 -- 외부 API 응답을 as 단언 없이 안전하게 파싱
- session_token을 httpOnly secure cookie에 accessToken 직접 저장 -- MVP 단순화, 별도 세션 스토어 불필요

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - 모든 태스크가 계획대로 완료됨.

## Known Stubs
None - 모든 함수가 실제 로직으로 구현됨. 모킹은 테스트에서만 사용.

## Next Phase Readiness
- Auth 모듈이 01-03(Crawler 모듈 TDD)에서 유저 데이터 조회에 활용 가능
- API Routes가 프론트엔드(Phase 4)에서 바로 호출 가능
- TDD 패턴이 01-03 Crawler 모듈에 동일하게 적용 가능

## Self-Check: PASSED

- [x] All 8 files exist on disk
- [x] Commit e444635 verified (TDD RED)
- [x] Commit 91e6091 verified (TDD GREEN)
- [x] Commit c45eec6 verified (API Routes)
- [x] 17 tests pass (pnpm test --run)
- [x] TypeScript compiles (pnpm typecheck)

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
