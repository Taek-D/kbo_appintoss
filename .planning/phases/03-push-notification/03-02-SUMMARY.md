---
phase: 03-push-notification
plan: 02
subsystem: push
tags: [notification-service, tdd, vitest, supabase, push-logs, promise-allsettled, rate-limit, 429-retry]

# Dependency graph
requires:
  - phase: 03-push-notification
    plan: 01
    provides: PushProvider 타입, createPushProvider() 팩토리, createServiceRoleClient(), TossPushRequest/Response 타입
  - phase: 02-data-pipeline
    provides: StateTransition 타입, syncGames(), poll/route.ts 폴링 엔드포인트
provides:
  - sendGameEndNotifications(transitions, pushProvider) — 경기 종료 알림 오케스트레이터
  - createPushProvider() re-export — Push 모듈 public API
  - poll/route.ts Push 발송 파이프라인 통합 완성
affects: [03-push-notification Plan 03 (있을 경우), Vercel 배포 후 실제 발송]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.allSettled()로 동시 경기 병렬 발송 — 한 경기 실패가 다른 경기를 블로킹하지 않음"
    - "for-of 순차 발송 + delay(100ms) — 토스 Push Rate Limit 준수 (PUSH-02)"
    - "429 응답 시 delay(1000ms) 후 1회 재시도 — D-08 패턴"
    - "vi.hoisted() + 테이블별 체인 mock — Supabase from() 체인 단위 테스트 패턴"
    - "mockFrom.mockImplementation(table => ...) — 병렬 처리 테스트에서 테이블명 기반 동적 mock"

key-files:
  created:
    - src/backend/modules/push/notification-service.ts
    - src/backend/modules/push/index.ts
    - src/backend/modules/push/__tests__/notification-service.test.ts
  modified:
    - src/app/api/cron/poll/route.ts
    - src/app/api/cron/poll/__tests__/route.test.ts

key-decisions:
  - "구독자 0명이어도 is_notified 플래그는 업데이트 — 재폴링 시 중복 발송 방지"
  - "Test 9(병렬 처리)에서 mockFrom.mockImplementation(table => ...)로 동적 체인 반환 — mockReturnValueOnce 큐 순서가 Promise.allSettled 병렬 실행에서 보장 불가"
  - "Test 11 assertion에 toHaveBeenNthCalledWith(3, 'games') 사용 — users/push_logs/games 순서로 3번 호출됨을 명시"
  - "템플릿 ID를 TOSS_TEMPLATE_ID_FINISHED/CANCELLED 환경변수로 관리 — 하드코딩 방지"

requirements-completed: [PUSH-01, PUSH-03, PUSH-05]

# Metrics
duration: 12min
completed: 2026-04-05
---

# Phase 03 Plan 02: NotificationService TDD + poll/route.ts 통합 Summary

**구독자 조회(in team_code), 100ms 순차 발송, 429 재시도, push_logs 기록, Promise.allSettled 동시 경기 처리를 TDD로 구현하고 poll/route.ts에 Push 파이프라인 통합 완성 (14+10=24개 테스트 모두 통과)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-05T11:07:58Z
- **Completed:** 2026-04-05T11:20:28Z
- **Tasks:** 2 (Task 1: TDD RED→GREEN, Task 2: route.ts 통합)
- **Files modified:** 5

## Accomplishments

- `src/backend/modules/push/notification-service.ts` — sendGameEndNotifications() 오케스트레이터 구현
  - finished/cancelled 전이만 필터링 (D-03)
  - Promise.allSettled()로 동시 경기 병렬 처리 (D-06, PUSH-03)
  - users 테이블 구독자 조회 (in team_code [homeTeam, awayTeam], subscribed=true)
  - for-of 순차 발송 + 100ms delay (D-04, PUSH-02)
  - 429 응답 시 1초 대기 후 1회 재시도 (D-08)
  - push_logs insert (sent/failed/rate_limited, PUSH-05)
  - is_notified_finish/is_notified_cancel 플래그 업데이트
- `src/backend/modules/push/index.ts` — sendGameEndNotifications, createPushProvider 공개 API
- `src/backend/modules/push/__tests__/notification-service.test.ts` — 14개 단위 테스트 모두 통과
- `src/app/api/cron/poll/route.ts` — Phase 3 Handoff Contract 주석 삭제, 실제 Push 발송 파이프라인 연결
  - transitions > 0일 때 createPushProvider() + sendGameEndNotifications() 호출
  - try/catch로 Push 실패 격리 — 폴링 전체를 실패시키지 않음
- `src/app/api/cron/poll/__tests__/route.test.ts` — Push 통합 테스트 3개 추가 (Tests 8-10)
- 전체 66개 테스트 통과, typecheck 0 errors, lint 0 errors

## Task Commits

1. **RED — NotificationService 실패 테스트 작성** - `38466ba` (test)
2. **GREEN — NotificationService 순차 발송 + push_logs 구현** - `5391d94` (feat)
3. **poll/route.ts Push 발송 파이프라인 통합** - `fd51982` (feat)

## Files Created/Modified

- `src/backend/modules/push/notification-service.ts` — NotificationService 오케스트레이터 (sendGameEndNotifications)
- `src/backend/modules/push/index.ts` — Push 모듈 public API (sendGameEndNotifications, createPushProvider)
- `src/backend/modules/push/__tests__/notification-service.test.ts` — NotificationService 14개 단위 테스트
- `src/app/api/cron/poll/route.ts` — Push 발송 파이프라인 통합 (Phase 3 Handoff Contract 대체)
- `src/app/api/cron/poll/__tests__/route.test.ts` — Push 통합 테스트 3개 추가

## Decisions Made

- 구독자 0명이어도 is_notified 플래그 업데이트 수행 — 재폴링 시 중복 발송 방지
- 템플릿 ID를 TOSS_TEMPLATE_ID_FINISHED/CANCELLED 환경변수로 관리 — 하드코딩 방지, 검수 전 mock 값으로 동작 가능
- Test 9(병렬 처리 검증)에서 mockFrom.mockImplementation(table => ...) 패턴 사용 — mockReturnValueOnce 큐 순서가 Promise.allSettled에서 보장 불가 문제 해결

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase mock 체인에 .eq('subscribed', true) 누락**
- **Found during:** Task 1 (GREEN 단계 — 11개 테스트 실패)
- **Issue:** 초기 테스트의 setupUsersQuery()가 `.in()` 결과를 직접 반환했으나, 구현 코드가 `.in(...).eq('subscribed', true)` 체인을 사용
- **Fix:** setupUsersQuery()를 `.select().in().eq()` 전체 체인을 mock하도록 재작성. 각 테스트마다 독립된 vi.fn() 인스턴스 생성
- **Files modified:** `src/backend/modules/push/__tests__/notification-service.test.ts`
- **Verification:** 14/14 통과

**2. [Rule 1 - Bug] Test 9 병렬 처리에서 mockFrom 큐 순서 불보장**
- **Found during:** Task 1 (GREEN 단계 — Test 9 실패: send()가 2번 대신 1번 호출)
- **Issue:** Promise.allSettled() 병렬 실행 시 mockReturnValueOnce 큐 소비 순서가 보장되지 않아 두 번째 경기의 users 조회가 잘못된 체인 반환
- **Fix:** Test 9에서 mockFrom.mockImplementation(table => ...) 패턴으로 테이블명 기반 동적 체인 반환
- **Files modified:** `src/backend/modules/push/__tests__/notification-service.test.ts`
- **Verification:** 14/14 통과

**3. [Rule 1 - Bug] Test 11 assertion에서 첫 번째 from() 호출이 'users'**
- **Found during:** Task 1 (GREEN 단계 — Test 11 실패)
- **Issue:** `expect(mockFrom).toHaveBeenCalledWith('games')`가 실패 — mockFrom의 1번째 호출은 'users', 3번째가 'games'
- **Fix:** `toHaveBeenNthCalledWith(3, 'games')`로 변경하여 호출 순서 명시
- **Files modified:** `src/backend/modules/push/__tests__/notification-service.test.ts`
- **Verification:** 14/14 통과

---

**Total deviations:** 3 auto-fixed (3 bugs — 모두 테스트 mock 설정 관련)
**Impact on plan:** 구현 코드 변경 없음. 테스트 mock 체인 설정만 수정. 범위 이탈 없음.

## Known Stubs

None — 모든 구현은 실제 동작 코드.
- 템플릿 ID(TOSS_TEMPLATE_ID_FINISHED/CANCELLED)는 환경변수로 관리되며 기본값('tmpl-finished'/'tmpl-cancelled') 사용 중. 실제 토스 검수 완료 후 환경변수 설정 필요.
- 환경변수 설정 전까지 기능적으로는 정상 동작하며 실제 토스 API 호출 시 템플릿 ID 불일치로 에러 발생 가능.

## Next Phase Readiness

- Push 알림 파이프라인 완성 — poll/route.ts → syncGames() → sendGameEndNotifications() → PushProvider.send() 전체 흐름 연결됨
- Phase 3 남은 작업: 실제 환경변수(TOSS_MTLS_CERT, TOSS_MTLS_KEY, TOSS_TEMPLATE_ID_*) 설정 후 E2E 검증
- 토스 Push 템플릿 검수(INFRA-02) 필요 — 검수 완료 후 실제 templateId 환경변수 설정

---
*Phase: 03-push-notification*
*Completed: 2026-04-05*
