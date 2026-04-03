---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.mts` — Wave 0에서 생성 |
| **Quick run command** | `pnpm test --run backend/modules/auth` |
| **Full suite command** | `pnpm test --run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run backend/modules/auth`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01 | smoke | `supabase db reset` (로컬) | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFRA-02 | manual | N/A — 앱인토스 콘솔 수동 확인 | N/A | ⬜ pending |
| 01-01-03 | 01 | 1 | INFRA-03 | integration | `pnpm test --run` (Supabase mock) | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-01 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | AUTH-01 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | AUTH-02 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | AUTH-02 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-05 | 02 | 1 | AUTH-03 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-06 | 02 | 1 | AUTH-04 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-07 | 02 | 2 | SUB-01 | unit | `pnpm test --run backend/modules/auth` | ❌ W0 | ⬜ pending |
| 01-02-08 | 02 | 2 | SUB-02 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.mts` — Vitest 설정 파일
- [ ] `vitest.setup.ts` — jest-dom 등 전역 설정
- [ ] `backend/modules/auth/__tests__/auth.test.ts` — Auth TDD 테스트 파일 (AUTH-01~04, SUB-01)
- [ ] `supabase/migrations/20260404000000_init_schema.sql` — 초기 스키마 마이그레이션 (INFRA-01)
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event msw vite-tsconfig-paths`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 토스 Push 메시지 템플릿 검수 신청 완료 | INFRA-02 | 앱인토스 콘솔에서 수동 신청 필요 | 1. 앱인토스 콘솔 접속 2. Push 메시지 템플릿 등록 3. 검수 신청 완료 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
