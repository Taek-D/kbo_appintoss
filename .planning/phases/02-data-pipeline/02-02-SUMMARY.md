---
phase: 02-data-pipeline
plan: 02
subsystem: polling-api
tags: [qstash, cron, tdd, api-route, kst-time-guard, signature-verification]
dependency_graph:
  requires: [02-01]
  provides: [polling-endpoint, qstash-setup-script]
  affects: [03-push-notifications]
tech_stack:
  added: ["@upstash/qstash@2.10.1"]
  patterns: [qstash-signature-verification, kst-time-guard, tdd-red-green]
key_files:
  created:
    - src/app/api/cron/poll/route.ts
    - src/app/api/cron/poll/__tests__/route.test.ts
    - scripts/setup-qstash.ts
  modified:
    - .env.example
decisions:
  - "QStash Receiver는 모듈 레벨 싱글턴으로 초기화 (Vercel 서버리스 cold start 최적화)"
  - "크롤링 실패 시 200 반환 — QStash 자동 재시도 방지 (D-01)"
  - "vi.hoisted()로 Receiver 생성자 모킹 해결 — vitest 호이스팅 이슈"
  - "Phase 3 Handoff Contract를 route.ts 주석으로 문서화"
metrics:
  duration: "8min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_changed: 4
---

# Phase 2 Plan 02: QStash 폴링 API Route + 설정 스크립트 Summary

**One-liner:** QStash 서명 검증 + KST 14~22시 가드 + 크롤러 호출 + Phase 3 핸드오프 계약을 포함한 폴링 엔드포인트 TDD 구현

## What Was Built

### Task 1: QStash 폴링 API Route TDD (RED → GREEN)

**RED phase** (`405ce2c`): 7개 failing 테스트 작성
- `vi.hoisted()`를 사용하여 Receiver 생성자 모킹 이슈 해결 (vitest 호이스팅 문제)
- `vi.useFakeTimers()` + `vi.setSystemTime()`으로 KST 시간 제어

**GREEN phase** (`f85c446`): 구현
- `src/app/api/cron/poll/route.ts` — QStash 폴링 엔드포인트
  - `new Receiver(...)` 서명 검증 (Upstash-Signature 헤더)
  - KST 14~22시 시간대 가드 (`kstHour < 14 || kstHour >= 22`)
  - `fetchTodayGames()` → `syncGames()` 순차 호출
  - 크롤링 실패 시 `status: 200` 반환 (QStash 자동 재시도 방지)
  - Phase 3 Handoff Contract 주석 문서화

### Task 2: 설정 스크립트 + 환경변수 문서화 (`6e5c9a8`)

- `scripts/setup-qstash.ts` — 배포 후 1회 실행으로 QStash Cron Schedule 등록
  - Cron: `*/3 5-13 * * *` (UTC) = 매 3분, KST 14~22시
  - `QSTASH_TOKEN`, `APP_URL` 환경변수 검증 후 실행
- `.env.example` — QStash 관련 4개 환경변수 템플릿 추가

## Tests

- 7개 테스트 모두 통과
- 전체 테스트 스위트: 41 tests across 6 files — 전부 통과
- `pnpm typecheck` — 통과
- `pnpm lint` — 통과

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted()로 Receiver 모킹 수정**
- **Found during:** Task 1 GREEN phase
- **Issue:** vitest가 `vi.mock()` 팩토리를 호이스팅하기 때문에 팩토리 외부에 선언된 `mockVerify` 변수에 접근 불가 (`ReferenceError: Cannot access 'mockVerify' before initialization`)
- **Fix:** `vi.hoisted()`를 사용하여 `mockVerify`를 모킹 팩토리보다 먼저 초기화
- **Files modified:** `src/app/api/cron/poll/__tests__/route.test.ts`
- **Commit:** `f85c446`

**2. [Rule 3 - Blocking] 워크트리 node_modules 설치**
- **Found during:** Task 1 RED phase 테스트 실행
- **Issue:** 워크트리에 node_modules가 없어 `pnpm test` 실행 불가
- **Fix:** `pnpm install` 실행으로 해결
- **Commit:** N/A (자동 해결)

## Phase 3 Handoff Contract

`route.ts`에 다음 계약이 주석으로 문서화되어 있다:

```
// Phase 3 Handoff Contract:
// transitions(StateTransition[])는 Phase 3에서 Push 알림 트리거로 사용된다.
// - toStatus === 'playing'  -> 경기 시작 알림 (is_notified_start 체크)
// - toStatus === 'finished' -> 경기 종료 알림 (is_notified_finish 체크)
// - toStatus === 'cancelled' -> 경기 취소 알림 (is_notified_cancel 체크)
```

## Known Stubs

None — 모든 기능이 실제 구현됨. QStash 환경변수는 배포 시 Upstash Console에서 발급.

## Self-Check: PASSED

- [x] `src/app/api/cron/poll/route.ts` 존재
- [x] `src/app/api/cron/poll/__tests__/route.test.ts` 존재 (7 tests)
- [x] `scripts/setup-qstash.ts` 존재
- [x] `.env.example` QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY, APP_URL 포함
- [x] 커밋 `405ce2c` (RED), `f85c446` (GREEN), `6e5c9a8` (Task 2) 존재
