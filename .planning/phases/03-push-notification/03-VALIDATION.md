---
phase: 3
slug: push-notification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test --run src/backend/modules/push/` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run src/backend/modules/push/`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PUSH-04 | unit | `pnpm test --run src/backend/modules/push/__tests__/push-provider.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PUSH-02 | unit | `pnpm test --run src/backend/modules/push/__tests__/push-provider.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | PUSH-01 | unit | `pnpm test --run src/backend/modules/push/__tests__/notification-service.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | PUSH-03 | unit | `pnpm test --run src/backend/modules/push/__tests__/notification-service.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | PUSH-05 | unit | `pnpm test --run src/backend/modules/push/__tests__/notification-service.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/backend/modules/push/__tests__/push-provider.test.ts` — stubs for PUSH-02, PUSH-04
- [ ] `src/backend/modules/push/__tests__/notification-service.test.ts` — stubs for PUSH-01, PUSH-03, PUSH-05

*Existing vitest infrastructure covers framework needs. Only test file stubs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 실제 토스 Push 수신 | PUSH-01 | mTLS 인증서 + 토스 서버 필요 | 검수 완료 후 실 기기에서 알림 수신 확인 |
| mTLS 인증서 유효성 | PUSH-04 | 실제 인증서 필요 | Vercel에 배포 후 토스 Push API 호출 성공 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
