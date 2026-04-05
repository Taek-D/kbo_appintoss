---
phase: 02
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 02-01-01 | 01 | 1 | DATA-01 | unit | `pnpm test --run src/backend/modules/crawler` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-04 | unit | `pnpm test --run src/backend/modules/crawler` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | DATA-02 | unit | `pnpm test --run src/backend/workers` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | DATA-03 | unit | `pnpm test --run src/backend/workers` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/backend/modules/crawler/__tests__/crawler-service.test.ts` — stubs for DATA-01, DATA-04
- [ ] `src/backend/workers/__tests__/polling-worker.test.ts` — stubs for DATA-02, DATA-03
- [ ] Test fixtures for kbo-game mock responses (success, empty, failure)

*Existing vitest infrastructure covers framework — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QStash signature verification | D-07 | Requires real QStash webhook | Deploy to Vercel preview, trigger QStash schedule, verify endpoint receives signed request |
| DB persistence across restart | DATA-02 | Requires Supabase connection | Run polling, stop, restart, verify no duplicate notifications |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
