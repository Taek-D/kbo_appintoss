---
phase: 4
slug: game-result-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UI-02 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | UI-03 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | UI-04 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | UI-01 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | UI-05 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gsap`, `@gsap/react`, `lenis` — npm 의존성 설치
- [ ] GSAP/Lenis SSR 가드 동작 확인 (빌드 오류 없음)

*Existing vitest infrastructure covers test framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 토스 디자인 스타일 일관성 | UI-05 | 시각적 검증 필요 | 화이트톤 bg-white, rounded-2xl, #0064FF 액센트 확인 |
| GSAP 카운트업 시각적 동작 | UI-03 | 애니메이션 시각 검증 | 브라우저에서 스코어 0→N 카운트업 확인 |
| Lenis 스크롤 부드러움 | UI-04 | 체감 검증 필요 | 결과 페이지 스크롤 시 부드러운 관성 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
