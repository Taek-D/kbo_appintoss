---
phase: 03-push-notification
plan: 01
subsystem: push
tags: [mtls, toss-push-api, https-agent, supabase, service-role, zod, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    provides: StateTransition 타입, poll/route.ts QStash webhook 컨텍스트
  - phase: 01-foundation
    provides: User 타입, supabase/server.ts 패턴, logger
provides:
  - TossPushRequest, TossPushResponse, PushProvider, PushLogStatus, NotificationType 타입 (src/types/push.ts)
  - createPushProvider() — mTLS 인증서 기반 토스 Push API 통신 모듈
  - createServiceRoleClient() — QStash webhook 환경(cookie 없음)용 Supabase Service Role 클라이언트
affects: [03-push-notification Plan 02 (NotificationService), 03-push-notification Plan 03 (poll/route.ts 통합)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "mTLS 인증서를 base64 환경변수에서 로드하여 Buffer.from(cert, 'base64')로 https.Agent에 전달"
    - "vi.hoisted() + MockAgent.mockImplementation(function(){}) — vitest에서 new 생성자 모킹 패턴"
    - "createServiceRoleClient() — QStash webhook 등 cookies() 없는 환경용 Supabase 클라이언트"

key-files:
  created:
    - src/types/push.ts
    - src/backend/modules/push/push-provider.ts
    - src/backend/modules/push/__tests__/push-provider.test.ts
    - src/lib/supabase/service.ts
  modified:
    - .env.example

key-decisions:
  - "mTLS 인증서는 TOSS_MTLS_CERT/KEY 환경변수에 base64 인코딩하여 저장, 런타임에 Buffer.from(x, 'base64')로 디코딩"
  - "PushProvider는 순수 API 통신만 담당 (mTLS, HTTP 요청/응답) — 비즈니스 로직은 Plan 02 NotificationService"
  - "createServiceRoleClient() 별도 헬퍼 생성 — QStash webhook은 cookies() 없이 동작해야 함"
  - "TOSS_PUSH_API_URL 환경변수 추가 — API URL 하드코딩 방지, 테스트에서도 오버라이드 가능"

patterns-established:
  - "vitest 생성자 모킹: vi.hoisted()로 MockClass 선언 후 mockImplementation(function(this){Object.assign(this, instance)}) 패턴"
  - "Push 모듈 팩토리 패턴: createPushProvider() 반환값이 PushProvider 인터페이스 — 의존성 주입 가능"

requirements-completed: [PUSH-04, PUSH-02]

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 03 Plan 01: Push Provider TDD Summary

**mTLS 인증서 base64 환경변수 로딩 + https.Agent 구성, 토스 Push API 통신 계층을 TDD로 구현 (8개 테스트 모두 통과)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-05T10:48:39Z
- **Completed:** 2026-04-05T11:03:00Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 5

## Accomplishments

- `src/types/push.ts` — TossPushRequest, TossPushResponse, PushProvider, PushLogStatus(Zod z.enum), NotificationType 타입 계약 정의 (Plan 02에서 import 가능)
- `src/backend/modules/push/push-provider.ts` — mTLS 인증서 누락 시 명시적 에러, base64 디코딩, https.Agent 구성, 200/401/429/네트워크 에러 핸들링
- `src/lib/supabase/service.ts` — SUPABASE_SERVICE_ROLE_KEY 기반 클라이언트 (QStash webhook용 cookies-free)
- 8개 단위 테스트 모두 통과, typecheck 0 errors, lint 0 errors

## Task Commits

TDD 사이클 커밋:

1. **RED — Push 타입 정의 + Service Role 클라이언트 + 실패 테스트** - `ca70262` (test)
2. **GREEN — PushProvider mTLS 구현** - `4df6798` (feat)

## Files Created/Modified

- `src/types/push.ts` — Push 관련 공유 타입 정의 (TossPushRequest, TossPushResponse, PushProvider, PushLogStatus, NotificationType)
- `src/backend/modules/push/push-provider.ts` — 토스 Push API mTLS 통신 모듈 (createPushProvider 팩토리)
- `src/backend/modules/push/__tests__/push-provider.test.ts` — PushProvider 단위 테스트 8개
- `src/lib/supabase/service.ts` — Service Role Supabase 클라이언트 (createServiceRoleClient)
- `.env.example` — TOSS_PUSH_API_URL 항목 추가

## Decisions Made

- `createServiceRoleClient()` 별도 헬퍼 추가 — poll/route.ts는 QStash webhook이므로 cookies() 없이 동작해야 함. 기존 `createServerSupabaseClient()`는 cookies() 의존으로 사용 불가
- `TOSS_PUSH_API_URL` 환경변수로 Push API URL 관리 — 하드코딩 방지, 테스트 오버라이드 가능

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vitest MockAgent 생성자 모킹 방식 수정**
- **Found during:** Task 1 (GREEN 단계 — Test 8 실패)
- **Issue:** `MockAgent.mockReturnValue(instance)` 및 화살표 함수 `mockImplementation(() => instance)`는 `new` 생성자 호출에 동작하지 않음 (vitest 제약)
- **Fix:** `MockAgent.mockImplementation(function(this) { Object.assign(this, instance) })` 패턴 적용. `options.agent`를 직접 비교하는 대신 `options.agent._isMockAgent` 속성 검증으로 변경
- **Files modified:** `src/backend/modules/push/__tests__/push-provider.test.ts`
- **Verification:** `pnpm test --run src/backend/modules/push/` — 8/8 통과
- **Committed in:** `4df6798` (GREEN 커밋에 포함)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 테스트 모킹 방식만 수정. 구현 코드 변경 없음. 범위 이탈 없음.

## Issues Encountered

- worktree에 node_modules가 없어 `pnpm install` 필요 — worktree 초기 실행 시 의존성 설치 필요 (일회성)

## Known Stubs

None — 모든 구현은 실제 동작 코드. 환경변수(TOSS_MTLS_CERT, TOSS_MTLS_KEY)가 실제 값으로 설정되면 프로덕션 동작 가능.

## User Setup Required

None — no external service configuration required.  
(실제 배포 시 `TOSS_MTLS_CERT`, `TOSS_MTLS_KEY`, `TOSS_PUSH_API_URL` 환경변수 설정 필요 — .env.example 참고)

## Next Phase Readiness

- `src/types/push.ts` 타입 계약 완성 — Plan 02 NotificationService에서 즉시 import 가능
- `createPushProvider()` 팩토리 준비 — Plan 02에서 의존성 주입으로 사용 가능
- `createServiceRoleClient()` 준비 — Plan 02 구독자 조회, push_logs 기록에 사용
- 실제 토스 Push 메시지 템플릿 검수(INFRA-02)는 여전히 Pending — 개발은 mock으로 진행 가능

---
*Phase: 03-push-notification*
*Completed: 2026-04-05*
