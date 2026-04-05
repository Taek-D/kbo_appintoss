---
phase: 04-game-result-ui
plan: 02
subsystem: frontend-ui
tags: [api-integration, main-page, game-card, navigation]
dependency_graph:
  requires:
    - Phase 04 Plan 01 (GameCard component, /api/games/today route)
  provides:
    - 메인 화면 실제 경기 데이터 연동 (fetch /api/games/today)
    - 응원팀 경기 상단 강조 + 다른 경기 하단 배치
    - 종료 경기 탭 시 /game/{id} 네비게이션
    - 경기 없는 날 기존 UI 유지
  affects:
    - src/app/(main)/page.tsx
tech_stack:
  added: []
  patterns:
    - useCallback + useEffect 분리 패턴으로 user fetch와 games fetch 독립 관리
    - IIFE(즉시실행함수)로 JSX 내부 myTeamGames/otherGames 분기 처리
    - unknown + type assertion 패턴 (any 금지 준수)
key_files:
  created: []
  modified:
    - src/app/(main)/page.tsx
decisions:
  - IIFE 패턴으로 JSX 내 myTeamGames/otherGames 계산 — 별도 useMemo 없이 렌더 시점 계산, MVP 단순화 원칙 준수
  - games fetch는 user fetch와 독립된 useEffect로 분리 — 유저 로딩 완료 전에도 경기 목록 병렬 조회 가능
metrics:
  duration: 1min
  completed_date: "2026-04-05"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 4 Plan 02: Main Page Game Data Integration Summary

**One-liner:** 메인 화면에 /api/games/today 연동으로 응원팀 강조 + 종료 경기 탭 시 /game/{id} 이동 완성

## What Was Built

### Modified: src/app/(main)/page.tsx

- `GameCard` import 추가 (`@/components/GameCard`)
- `Game` 타입 import 추가 (`@/types/game`)
- `games: Game[]`, `isGamesLoading: boolean` 상태 추가
- `fetchGames()` useCallback + 독립 useEffect 추가 (`fetch('/api/games/today')`)
- 기존 하드코딩 "오늘 경기 없음" 영역을 3단계 분기로 교체:
  1. `isGamesLoading` → 스켈레톤 2개 (animate-pulse bg-gray-100)
  2. `games.length === 0` → 기존 "오늘 경기 없음" UI (per D-07 유지)
  3. 경기 있을 때 → myTeamGames(응원팀, 상단 파란 섹션) + otherGames(하단 회색 섹션)
- `GameCard onClick`: `status === 'finished'`이면 `router.push('/game/${game.id}')`, 나머지는 `undefined`

## Test Results

- 83 tests passed (13 files) — Plan 01 기준 유지, 신규 테스트 없음 (UI 연동 변경은 TDD 필수 구간 아님)
- `pnpm typecheck`: 0 errors
- `pnpm lint`: 0 errors

## Deviations from Plan

None - 플랜의 코드 스펙대로 정확히 구현됨.

## Known Stubs

None - /api/games/today → DB 실제 데이터 조회. GameCard는 실제 game 객체 렌더링.

## Checkpoint Status

Task 2 (전체 서비스 UI 시각 검증)은 `type="checkpoint:human-verify"` — 인간 검증 대기 중.

## Self-Check: PASSED
