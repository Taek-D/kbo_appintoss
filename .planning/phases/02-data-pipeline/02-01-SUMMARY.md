---
phase: 02-data-pipeline
plan: "01"
subsystem: crawler
tags: [tdd, crawler, kbo-game, supabase, state-transition, migration]
dependency_graph:
  requires:
    - "01-03: Supabase 클라이언트 (createServerSupabaseClient)"
    - "01-03: 로거 (logger)"
    - "kbo-game@0.0.2 npm 패키지"
  provides:
    - "fetchTodayGames(): CrawlerResult — kbo-game 래핑, null/[] 분리"
    - "syncGames(CrawlerGame[]): StateTransition[] — DB upsert + 상태 전이 감지"
    - "mapKboStatusToDb(KboGameStatus): GameStatus — 대문자→소문자 매핑"
    - "src/types/crawler.ts — CrawlerResult, CrawlerGame, StateTransition, KboGameStatus"
    - "supabase migration: is_notified 상태별 분리 + 복합 unique 제약"
  affects:
    - "02-02: 폴링 API Route — fetchTodayGames + syncGames 호출"
    - "03-xx: Push Provider — StateTransition[] 구독하여 알림 발송"
tech_stack:
  added:
    - "kbo-game@0.0.2"
    - "@upstash/qstash@2.10.1"
  patterns:
    - "TDD (RED→GREEN): vi.mock으로 외부 의존성 격리"
    - "Discriminated union CrawlerResult (success/failure 분리)"
    - "DB upsert onConflict: game_date,home_team,away_team"
key_files:
  created:
    - "supabase/migrations/20260405000000_game_notified_flags.sql"
    - "src/types/crawler.ts"
    - "src/backend/modules/crawler/game-state-mapper.ts"
    - "src/backend/modules/crawler/crawler-service.ts"
    - "src/backend/modules/crawler/game-repository.ts"
    - "src/backend/modules/crawler/index.ts"
    - "src/backend/modules/crawler/__tests__/crawler-service.test.ts"
    - "src/backend/modules/crawler/__tests__/game-repository.test.ts"
  modified:
    - "src/types/game.ts (is_notified → is_notified_start/finish/cancel)"
    - "package.json (kbo-game, @upstash/qstash 추가)"
decisions:
  - "kbo-game@0.0.2 실제 타입: date는 Date 객체, score는 { home, away } 옵셔널 — RESEARCH.md의 추정 타입과 다름. score?.home ?? 0 패턴으로 처리"
  - "is_notified 단일 플래그 → is_notified_start/finish/cancel 3개 분리 (per D-06) — upsert 페이로드에서 제외하여 덮어쓰기 방지"
  - "Game 타입(game.ts)도 마이그레이션에 맞게 동기화 — is_notified_start/finish/cancel로 업데이트"
metrics:
  duration: "8min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 8
  files_modified: 2
---

# Phase 02 Plan 01: CrawlerService + GameRepository TDD Summary

**One-liner:** kbo-game 래핑 CrawlerService(null/[] 분리 discriminated union)와 상태 전이 감지 GameRepository(upsert onConflict + is_notified_* 보존)를 TDD로 구현, DB is_notified 3분할 마이그레이션 완료.

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | DB 마이그레이션 + 공유 타입 + CrawlerService TDD | cdb48ed, f412a26, a42c94d | migration, crawler.ts, game-state-mapper, crawler-service, tests |
| 2 | GameRepository TDD — 상태 전이 감지 + Supabase upsert | 69230c2, eb12853 | game-repository, index, test, game.ts |

## Commits

| Hash | Message |
|------|---------|
| cdb48ed | chore(02-01): 추가: is_notified 상태별 분리 + 복합 unique 제약 마이그레이션 |
| f412a26 | test(02-01): 추가: CrawlerService + GameStateMapper 실패 테스트 |
| a42c94d | feat(02-01): 구현: CrawlerService kbo-game 래핑 + GameStateMapper |
| 69230c2 | test(02-01): 추가: GameRepository 상태 전이 감지 실패 테스트 |
| eb12853 | feat(02-01): 구현: GameRepository 상태 전이 감지 + crawler 모듈 public API |

## Verification Results

- `pnpm test --run src/backend/modules/crawler` — 17 tests passed (2 files)
- `pnpm test --run` — 34 tests passed (5 files, 기존 Phase 1 테스트 포함)
- `pnpm typecheck` — TypeScript 에러 없음

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] kbo-game 실제 타입이 RESEARCH.md 추정 타입과 다름**
- **Found during:** Task 1 GREEN → typecheck
- **Issue:** RESEARCH.md는 `date: string`, `homeScore: number`, `awayScore: number`, `currentInning: number`로 추정했으나 실제 kbo-game@0.0.2 타입은 `date: Date`, `score?: { home: number; away: number }`, `currentInning?: number`
- **Fix:** `crawler-service.ts`에서 `formatDate(game.date: Date)` 처리, `game.score?.home ?? 0`, `game.currentInning ?? 0` 패턴 적용
- **Files modified:** `src/backend/modules/crawler/crawler-service.ts`, `src/backend/modules/crawler/__tests__/crawler-service.test.ts`
- **Commit:** eb12853 (통합 커밋)

**2. [Rule 1 - Bug] Game 타입(game.ts)이 마이그레이션과 불일치**
- **Found during:** Task 2 시작 시 분석
- **Issue:** DB 마이그레이션에서 `is_notified` → `is_notified_start/finish/cancel`로 변경했으나 `src/types/game.ts`의 `Game` 타입이 여전히 `is_notified: boolean`을 보유
- **Fix:** `game.ts`의 `Game` 타입을 `is_notified_start`, `is_notified_finish`, `is_notified_cancel` 3개 필드로 업데이트
- **Files modified:** `src/types/game.ts`
- **Commit:** 69230c2

## Known Stubs

None — 모든 구현이 실제 동작 코드임. kbo-game 호출과 Supabase upsert는 테스트에서 mock되었으나 실 환경에서 실제 작동.

## Self-Check: PASSED

- [x] `supabase/migrations/20260405000000_game_notified_flags.sql` — FOUND
- [x] `src/types/crawler.ts` — FOUND
- [x] `src/backend/modules/crawler/game-state-mapper.ts` — FOUND
- [x] `src/backend/modules/crawler/crawler-service.ts` — FOUND
- [x] `src/backend/modules/crawler/game-repository.ts` — FOUND
- [x] `src/backend/modules/crawler/index.ts` — FOUND
- [x] `src/backend/modules/crawler/__tests__/crawler-service.test.ts` — FOUND
- [x] `src/backend/modules/crawler/__tests__/game-repository.test.ts` — FOUND
- [x] Commits cdb48ed, f412a26, a42c94d, 69230c2, eb12853 — FOUND
- [x] 34 tests passed, typecheck clean
