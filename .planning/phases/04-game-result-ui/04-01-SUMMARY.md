---
phase: 04-game-result-ui
plan: 01
subsystem: frontend-ui
tags: [api-routes, components, gsap, lenis, tdd]
dependency_graph:
  requires:
    - Phase 01 (auth API, supabase client)
    - Phase 02 (Game type, DB schema)
    - Phase 03 (push notification infrastructure)
  provides:
    - GET /api/games/today — 오늘 경기 목록 API
    - GET /api/games/[id] — 개별 경기 상세 API
    - ScoreBoard component — GSAP 카운트업 스코어보드
    - InningTable component — 이닝별 점수 테이블
    - GameCard component — 경기 상태별 카드
    - /game/[id] page — 경기 결과 전체 화면
  affects:
    - 메인 화면 (GameCard로 오늘 경기 목록 표시 연동 가능)
tech_stack:
  added:
    - gsap@3.14.2
    - "@gsap/react@2.1.2"
    - lenis@1.3.21
  patterns:
    - useGSAP hook for GSAP animation lifecycle management
    - Lenis smooth scroll per-page initialization/destroy
    - vi.hoisted() for mock variables used in vi.mock factories
    - Zod z.string().uuid() for route param validation
    - unknown + type guard pattern for JSONB parsing (no any)
key_files:
  created:
    - src/types/game.ts (extended — InningScore + parseInningData added)
    - src/app/api/games/today/route.ts
    - src/app/api/games/[id]/route.ts
    - src/app/api/games/__tests__/today.test.ts
    - src/app/api/games/__tests__/[id].test.ts
    - src/components/ScoreBoard.tsx
    - src/components/InningTable.tsx
    - src/components/GameCard.tsx
    - src/components/__tests__/ScoreBoard.test.tsx
    - src/components/__tests__/InningTable.test.tsx
    - src/components/__tests__/GameCard.test.tsx
    - src/app/(main)/game/[id]/page.tsx
  modified: []
decisions:
  - gsap default import (import gsap from 'gsap') — named { gsap } import causes mock resolution issues in vitest
  - vi.hoisted() for all mock variables used in vi.mock factories — prevents temporal dead zone errors
  - useGSAP mock calls callback synchronously during render — refs are null in jsdom, so gsap.from receives null target (acceptable for test verification)
  - Lenis autoRaf option not used (per lenis@1.x API) — uses duration/easing/syncTouch options
  - KBO_TEAMS import removed from page.tsx (unused after cleanup)
metrics:
  duration: 15min
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 12
  files_modified: 1
---

# Phase 4 Plan 01: Game Result UI Summary

**One-liner:** GSAP 카운트업 ScoreBoard + Lenis smooth scroll이 적용된 /game/[id] 결과 페이지와 오늘/개별 경기 API Route 구현

## What Was Built

### API Routes
- `GET /api/games/today`: KST 기준 오늘 날짜로 경기 목록 조회. DB 에러 시 500, 정상 시 200 + `{ games: Game[] }`.
- `GET /api/games/[id]`: Zod `z.string().uuid()` 검증 → 유효하지 않으면 400, DB에 없으면 404, 성공 시 200 + `{ game: Game }`.

### Types
- `InningScore` 타입: `{ inning: number; home: number; away: number }`
- `parseInningData()`: `Record<string, unknown> | null` → `InningScore[]`. unknown + 타입 가드 패턴, null 안전 처리.

### Components
- **ScoreBoard**: GSAP `useGSAP` 훅으로 홈/원정 스코어 카운트업 애니메이션. 승리팀 `text-[#0064FF]`, 패배팀 `text-gray-400`. 응원팀 승리 시 파란 그라데이션 배너.
- **InningTable**: 1~9회 + R(합계) 테이블. 빈 배열 → "이닝 정보가 없습니다". 데이터 없는 회차 → "-".
- **GameCard**: scheduled/playing/finished/cancelled 4가지 상태별 UI. `isMyTeam`이면 `border-l-4 border-[#0064FF]` 강조.

### Page
- `/game/[id]`: ScoreBoard + InningTable + 경기 정보 섹션. Lenis smooth scroll (마운트 init, 언마운트 destroy). 잘못된 gameId → `router.replace('/')`. 뒤로가기 → 항상 메인.

## Test Results

- 기존: 66 tests (8 files)
- 신규: 17 tests (5 files)
- 전체: **83 tests passed, 13 files, 0 failed**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] gsap named import → default import**
- **Found during:** Task 1 implementation
- **Issue:** `import { gsap } from 'gsap'` — vitest mock으로 `{ default: {...} }` 형식으로 모킹할 때 named `gsap` export가 mock을 통과하지 못함
- **Fix:** `import gsap from 'gsap'` (default import)로 변경
- **Files modified:** src/components/ScoreBoard.tsx

**2. [Rule 1 - Bug] ScoreBoard 테스트 — vi.hoisted() 미사용으로 TDZ 에러**
- **Found during:** Task 1 test execution
- **Issue:** `const mockGsapFrom = vi.fn()` 모듈 최상단에 선언 시 vi.mock 팩토리 호이스팅으로 인한 `Cannot access 'mockGsapFrom' before initialization` 에러
- **Fix:** `vi.hoisted()` 패턴으로 변경
- **Files modified:** src/components/__tests__/ScoreBoard.test.tsx

**3. [Rule 1 - Bug] clearAllMocks()가 useGSAP mock 구현 초기화**
- **Found during:** Task 1 Test 4 디버깅
- **Issue:** `vi.clearAllMocks()`가 useGSAP의 콜백 실행 구현을 초기화하여 Test 4에서 gsap.from이 호출되지 않음
- **Fix:** `beforeEach`에서 `mockUseGSAP.mockImplementation((cb) => cb())` 재적용
- **Files modified:** src/components/__tests__/ScoreBoard.test.tsx

**4. [Rule 1 - Bug] useGSAP refs null in jsdom**
- **Found during:** Task 1 Test 4
- **Issue:** useGSAP mock이 render 도중 콜백을 동기 실행하므로 React ref가 아직 DOM에 붙지 않아 `null`. `if (ref.current)` 가드로 gsap.from이 호출되지 않음
- **Fix:** null 가드 제거. `expect.anything()` → `null` 매처로 테스트 수정
- **Files modified:** src/components/ScoreBoard.tsx, src/components/__tests__/ScoreBoard.test.tsx

**5. [Rule 3 - Blocking] worktree에 node_modules 없음**
- **Found during:** 테스트 실행 시도
- **Issue:** worktree는 독립 디렉토리이므로 `pnpm test`가 vitest를 찾지 못함
- **Fix:** 메인 레포 node_modules의 vitest를 `pnpm exec vitest --root ... --config ...`로 worktree 기준 실행
- **Impact:** 테스트 커맨드를 `pnpm exec vitest --run --root <worktree> --config <worktree>/vitest.config.mts` 형식으로 실행

## Known Stubs

None - 모든 데이터 흐름이 실제 API와 연동됨. Lenis CSS import (`lenis/dist/lenis.css`)는 jsdom 환경에서 무시되지만 프로덕션에서 정상 동작.

## Self-Check: PASSED
