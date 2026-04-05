---
phase: 02
slug: data-pipeline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-05
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-01, DATA-04 | unit | `pnpm test --run src/backend/modules/crawler/__tests__/crawler-service.test.ts` | TDD (created in task) | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-02, INFRA-03 | unit | `pnpm test --run src/backend/modules/crawler/__tests__/game-repository.test.ts` | TDD (created in task) | ⬜ pending |
| 02-02-01 | 02 | 2 | DATA-01, DATA-02, DATA-04 | unit | `pnpm test --run src/app/api/cron/poll/__tests__/route.test.ts` | TDD (created in task) | ⬜ pending |
| 02-02-02 | 02 | 2 | (integration) | integration | `pnpm test --run && pnpm typecheck && pnpm lint` | N/A (no new test file) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All test files are created as part of TDD tasks (RED phase creates test, GREEN phase makes it pass). No separate Wave 0 stubs needed:

- [x] `src/backend/modules/crawler/__tests__/crawler-service.test.ts` — created in Plan 01 Task 1 RED phase
- [x] `src/backend/modules/crawler/__tests__/game-repository.test.ts` — created in Plan 01 Task 2 RED phase
- [x] `src/app/api/cron/poll/__tests__/route.test.ts` — created in Plan 02 Task 1 RED phase
- [x] Test fixtures for kbo-game mock responses (success, empty, failure) — embedded in test files via vi.mock

*Existing vitest infrastructure covers framework — TDD plans create tests inline.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QStash signature verification | D-07 | Requires real QStash webhook | Deploy to Vercel preview, trigger QStash schedule, verify endpoint receives signed request |
| DB persistence across restart | INFRA-03 | Requires Supabase connection | Run polling, stop, restart, verify no duplicate notifications |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or TDD inline creation
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all test file creation (via TDD RED phase)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
