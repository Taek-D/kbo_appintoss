---
phase: 03-push-notification
verified: 2026-04-05T11:35:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "실제 토스 Push API 수신 확인"
    expected: "경기 종료 감지 후 실제 토스 앱에서 알림이 수신된다"
    why_human: "TOSS_MTLS_CERT/KEY 실제 인증서 없이 프로그래밍적으로 검증 불가. 실제 토스 Push API 엔드포인트는 외부 서비스. INFRA-02(템플릿 검수)도 미완이므로 실제 알림 수신은 E2E 환경에서만 확인 가능."
  - test: "TOSS_TEMPLATE_ID_FINISHED/CANCELLED 환경변수 설정 후 실제 발송"
    expected: "검수 완료된 templateId로 발송 시 토스 앱에서 알림 포맷이 올바르게 표시된다"
    why_human: "현재 기본값('tmpl-finished'/'tmpl-cancelled')은 실제 검수된 값이 아님. 토스 Push 템플릿 검수(INFRA-02) 완료 후 환경변수 설정 및 수동 검증 필요."
---

# Phase 03: Push Notification Verification Report

**Phase Goal:** 경기 종료가 감지되는 즉시 해당 팀 구독자 전원에게 토스 푸시 알림이 Rate Limit을 준수하며 발송된다
**Verified:** 2026-04-05T11:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 경기 종료 감지 후 구독자에게 토스 Push 알림이 실제로 수신된다 | ? HUMAN | 코드 파이프라인 완전 구현됨. poll → syncGames → sendGameEndNotifications → PushProvider.send() 전체 흐름 연결. 실제 수신은 외부 서비스 의존으로 인간 검증 필요. |
| 2 | 알림 발송이 100ms 간격 순차 큐로 처리되어 Rate Limit 오류가 발생하지 않는다 | ✓ VERIFIED | `notification-service.ts:125` — `await delay(100)` (for-of 루프 내 매 발송 후). Test 4에서 `vi.advanceTimersByTime`으로 호출 간격 검증 (22/22 테스트 통과). |
| 3 | 동시에 2개 경기가 종료되어도 각 경기 발송이 서로 블로킹하지 않고 각각 완료된다 | ✓ VERIFIED | `notification-service.ts:176` — `Promise.allSettled(endTransitions.map(...))`. Test 9(2경기 병렬 완료), Test 10(한 경기 실패해도 다른 경기 완료) 검증 완료. |
| 4 | mTLS 인증서 없이 Push API 호출 시 명시적 오류가 발생하고, 올바른 인증서로는 성공한다 | ✓ VERIFIED | `push-provider.ts:16-18` — `if (!cert \|\| !key) throw new Error('mTLS 인증서 환경변수가 설정되지 않았습니다')`. Test 1(cert+key 없음), Test 2(cert만 있음), Test 4(200 성공), Test 8(https.Agent에 cert/key 전달) 검증 완료. |
| 5 | 발송 성공/실패 결과가 push_logs 테이블에 기록되어 확인할 수 있다 | ✓ VERIFIED | `notification-service.ts:108-113` — `supabase.from('push_logs').insert({ user_id, game_id, status, error_message })`. Test 7('failed'), Test 8('sent'), Test 6('rate_limited') 상태 구분 기록 검증. |

**Score:** 4/5 자동 검증 완료 (Truth 1은 외부 서비스 의존으로 인간 검증 필요, 구현은 완전함)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/push.ts` | Push 관련 공유 타입 정의 | ✓ VERIFIED | TossPushRequest, TossPushResponse, PushProvider, PushLogStatus(z.enum), NotificationType — 41줄, 모든 타입 정의 존재 |
| `src/backend/modules/push/push-provider.ts` | 토스 Push API mTLS 통신 모듈 | ✓ VERIFIED | `createPushProvider()` export, `Buffer.from(cert, 'base64')`, `new https.Agent` — 72줄, 실제 구현 |
| `src/backend/modules/push/__tests__/push-provider.test.ts` | PushProvider 단위 테스트 (min 80줄) | ✓ VERIFIED | 225줄, 8개 test 블록 — 8/8 통과 |
| `src/lib/supabase/service.ts` | Service Role Supabase 클라이언트 | ✓ VERIFIED | `createServiceRoleClient()` export, `SUPABASE_SERVICE_ROLE_KEY` 참조 — 17줄, 실제 구현 |
| `src/backend/modules/push/notification-service.ts` | 구독자 조회 + 순차 발송 + push_logs 기록 오케스트레이션 | ✓ VERIFIED | `sendGameEndNotifications()` export, 193줄. Promise.allSettled, for-of 루프, delay(100), 429 재시도, push_logs insert, is_notified 플래그 업데이트 모두 포함 |
| `src/backend/modules/push/__tests__/notification-service.test.ts` | NotificationService 단위 테스트 (min 120줄) | ✓ VERIFIED | 436줄, 14개 test 블록 — 14/14 통과 |
| `src/backend/modules/push/index.ts` | Push 모듈 public API | ✓ VERIFIED | `sendGameEndNotifications`, `createPushProvider` 둘 다 re-export — 7줄 |
| `src/app/api/cron/poll/route.ts` | Push 발송 통합된 폴링 엔드포인트 | ✓ VERIFIED | `sendGameEndNotifications` 호출 포함, try/catch로 Push 실패 격리. "Phase 3 Handoff Contract" 주석 삭제 확인 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `push-provider.ts` | `TOSS_MTLS_CERT/TOSS_MTLS_KEY` env vars | `Buffer.from(cert, 'base64') → https.Agent` | ✓ WIRED | Line 21-23: `Buffer.from(cert, 'base64')`, `Buffer.from(key, 'base64')` — https.Agent 생성자에 전달 |
| `push-provider.ts` | `src/types/push.ts` | `import type` | ✓ WIRED | Line 3: `import type { TossPushRequest, TossPushResponse, PushProvider } from '@/types/push'` |
| `notification-service.ts` | `push-provider.ts` (PushProvider) | 의존성 주입 — `pushProvider.send` | ✓ WIRED | Line 88, 93: `pushProvider.send(request)` — 의존성 주입으로 직접 결합하지 않음 |
| `notification-service.ts` | supabase `push_logs` table | `createServiceRoleClient().from('push_logs').insert` | ✓ WIRED | Line 108: `supabase.from('push_logs').insert(...)` |
| `notification-service.ts` | supabase `users` table | `createServiceRoleClient().from('users').select` | ✓ WIRED | Line 39-43: `.from('users').select().in('team_code', [...]).eq('subscribed', true)` |
| `poll/route.ts` | `src/backend/modules/push/index.ts` | `import { sendGameEndNotifications, createPushProvider }` | ✓ WIRED | Line 3: import 확인. Line 52-53: `createPushProvider()` + `sendGameEndNotifications(transitions, pushProvider)` 호출 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `notification-service.ts` | `users` (구독자 목록) | `supabase.from('users').select().in().eq()` | DB 쿼리 (Supabase) | ✓ FLOWING |
| `notification-service.ts` | push_logs 기록 | `supabase.from('push_logs').insert()` | DB write (Supabase) | ✓ FLOWING |
| `notification-service.ts` | is_notified 플래그 | `supabase.from('games').update().eq()` | DB write (Supabase) | ✓ FLOWING |
| `push-provider.ts` | Push API 응답 | `fetch(TOSS_PUSH_API_URL, { method: 'POST', agent })` | 외부 API (mTLS) | ? HUMAN (외부 서비스) |
| `poll/route.ts` | `transitions` | `syncGames(result.games)` (Phase 2 산출물) | DB 기반 상태 전이 감지 | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Push 모듈 전체 테스트 (8+14=22개) | `pnpm test --run src/backend/modules/push/` | 2 files, 22 tests passed | ✓ PASS |
| poll/route.ts 통합 테스트 (10개) | `pnpm test --run src/app/api/cron/poll/__tests__/route.test.ts` | 1 file, 10 tests passed | ✓ PASS |
| 전체 테스트 스위트 (8파일) | `pnpm test --run` | 8 files, 66 tests passed | ✓ PASS |
| TypeScript 타입 검사 | `pnpm typecheck` | exit 0, 0 errors | ✓ PASS |
| ESLint 검사 | `pnpm lint` | exit 0, 0 errors | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PUSH-01 | 03-02-PLAN | 경기 종료 감지 시 해당 팀 구독자에게 토스 푸시 알림을 발송한다 | ✓ SATISFIED | `sendGameEndNotifications()` — finished/cancelled 필터링 후 users 조회 + 발송. poll/route.ts에서 transitions 후 호출. |
| PUSH-02 | 03-01-PLAN, 03-02-PLAN | 알림 발송은 100ms 간격의 순차 큐로 Rate Limit을 준수한다 | ✓ SATISFIED | `delay(100)` in for-of loop (notification-service.ts:125). Test 4로 검증. |
| PUSH-03 | 03-02-PLAN | 동시에 여러 경기가 종료되어도 각 경기 발송이 서로 블로킹하지 않는다 | ✓ SATISFIED | `Promise.allSettled()` (notification-service.ts:176). Test 9, 10으로 검증. |
| PUSH-04 | 03-01-PLAN | mTLS 인증서를 통한 토스 Push API 인증이 정상 동작한다 | ✓ SATISFIED | `createMtlsAgent()` — 환경변수 없으면 명시적 에러, 있으면 `Buffer.from(..., 'base64')` → `https.Agent`. Test 1, 2, 8로 검증. |
| PUSH-05 | 03-02-PLAN | 발송 결과 및 에러를 push_logs에 기록한다 | ✓ SATISFIED | `supabase.from('push_logs').insert({ user_id, game_id, status, error_message })` (notification-service.ts:108-113). sent/failed/rate_limited 구분 기록. Test 6, 7, 8로 검증. |

**Coverage:** 5/5 요구사항 모두 충족

**REQUIREMENTS.md Traceability 확인:**
- REQUIREMENTS.md 라인 26-30: PUSH-01 ~ PUSH-05 모두 Phase 3 매핑, [x] 체크 상태 확인.
- 03-01-PLAN 선언: [PUSH-04, PUSH-02] — 두 요구사항 모두 구현 확인.
- 03-02-PLAN 선언: [PUSH-01, PUSH-03, PUSH-05] — 세 요구사항 모두 구현 확인.
- 5개 요구사항 전부 두 plan에 분리되어 선언 및 구현됨. 누락/중복 없음.

**orphaned requirements 없음:** REQUIREMENTS.md에서 Phase 3으로 매핑된 요구사항(PUSH-01~05)이 모두 plan frontmatter에 선언됨.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `notification-service.ts` | 63-64 | `templateId` 기본값 `'tmpl-finished'/'tmpl-cancelled'` | ℹ️ Info | INFRA-02 미완(토스 템플릿 검수)으로 인한 의도된 임시값. 환경변수(`TOSS_TEMPLATE_ID_FINISHED/CANCELLED`) 설정 시 즉시 대체됨. 실제 토스 API 호출 시 템플릿 ID 불일치로 에러 발생 가능. |
| `notification-service.ts` | n/a | `.env.example`에 `TOSS_MTLS_KEY` 누락 | ⚠️ Warning | `.env.example` grep 결과에서 `TOSS_MTLS_CERT`는 있으나 `TOSS_MTLS_KEY`와 `TOSS_TEMPLATE_ID_*` 항목이 누락. 개발자 온보딩 시 환경변수 설정 누락 위험. 기능 차단은 아님. |

**스텁 분류 결과:** 프로덕션 코드에 placeholder/TODO/console.log 없음. 위 두 항목은 외부 검수 프로세스(INFRA-02) 의존으로 인한 의도적 상황이며 기능 블로커가 아님.

---

### Human Verification Required

#### 1. 실제 토스 Push API 수신 확인

**Test:** TOSS_MTLS_CERT, TOSS_MTLS_KEY 실제 인증서와 검수 완료된 TOSS_TEMPLATE_ID_FINISHED를 환경변수에 설정한 뒤, KBO 경기 종료 시나리오를 트리거하여 실제 토스 앱 알림 수신 여부 확인
**Expected:** 응원팀 경기 종료 시 해당 팀 구독자의 토스 앱에 Push 알림이 수신된다
**Why human:** 토스 Push API는 외부 서비스로 실제 mTLS 인증서 없이 호출 불가. INFRA-02(토스 Push 메시지 템플릿 검수) 미완료 상태여서 실제 수신 검증은 검수 완료 후 수동 E2E 테스트 필요.

#### 2. TOSS_TEMPLATE_ID 환경변수 설정 후 알림 포맷 확인

**Test:** 토스 Push 템플릿 검수 완료 후, TOSS_TEMPLATE_ID_FINISHED와 TOSS_TEMPLATE_ID_CANCELLED를 실제 templateId로 설정하고 발송 테스트 실행
**Expected:** 알림 메시지에 팀 이름(homeTeam, awayTeam), 딥링크(/game/{gameId}), 경기 종료 문구가 올바르게 표시된다
**Why human:** 토스 Push 알림 포맷과 templateArgs 렌더링은 토스 앱 UI에서만 시각적으로 확인 가능. 현재 기본값 'tmpl-finished'/'tmpl-cancelled'는 미검수 ID.

---

### Gaps Summary

자동화 검증 기준 Gap 없음.

5개 성공 기준 중 4개(SC-2, SC-3, SC-4, SC-5)는 코드 레벨에서 완전히 검증되었으며 테스트로 뒷받침된다. SC-1("실제로 수신된다")은 외부 서비스(토스 Push API, INFRA-02 템플릿 검수) 의존으로 인간 검증이 필요하지만, 코드 파이프라인(poll → syncGames → sendGameEndNotifications → PushProvider.send)은 완전히 구현되고 연결되어 있다.

INFRA-02(토스 Push 메시지 템플릿 검수)는 Phase 3 요구사항이 아닌 별도 인프라 항목이며 현재 Pending 상태임을 확인. Phase 3 요구사항(PUSH-01~05) 자체는 모두 충족되었다.

---

_Verified: 2026-04-05T11:35:00Z_
_Verifier: Claude (gsd-verifier)_
