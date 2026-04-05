---
phase: 02-data-pipeline
verified: 2026-04-05T07:20:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "QStash Cron Schedule이 실제 Upstash Console에서 등록되고 3분 간격으로 /api/cron/poll을 호출하는지 확인"
    expected: "Upstash Dashboard에 */3 5-13 * * * 스케줄이 등록되고 배포 URL로 POST 요청이 전송된다"
    why_human: "외부 서비스(Upstash QStash) 연동 — 실제 API 키와 배포 URL 없이 프로그래matic 검증 불가"
  - test: "Supabase DB 마이그레이션(20260405000000_game_notified_flags.sql)이 실제 Supabase 프로젝트에 적용되었는지 확인"
    expected: "games 테이블에 is_notified_start, is_notified_finish, is_notified_cancel 컬럼과 uq_games_date_teams unique 제약이 존재한다"
    why_human: "실제 Supabase 인스턴스 접근 없이 적용 여부 검증 불가 (마이그레이션 파일 존재 확인됨, 적용 여부는 별도)"
---

# Phase 02: Data Pipeline Verification Report

**Phase Goal:** 시스템이 KBO 경기 데이터를 실시간으로 수집하고, 경기 종료 시점을 정확하게 감지하며, 상태가 DB에 영속화된다
**Verified:** 2026-04-05T07:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | fetchTodayGames()가 kbo-game getGame(new Date()) 호출 후 CrawlerResult를 반환한다 | VERIFIED | crawler-service.ts L12: `await getGame(new Date())`, returns discriminated union |
| 2 | kbo-game이 null을 반환하면 { success: false, error } 경로로 처리된다 | VERIFIED | crawler-service.ts L14-18: null guard returns `{ success: false, error }` |
| 3 | kbo-game이 빈 배열을 반환하면 { success: true, games: [] } 경로로 처리된다 | VERIFIED | crawler-service.ts L20-33: array path returns `{ success: true, games: [] }` for empty array |
| 4 | syncGames()가 DB의 이전 상태와 비교하여 Scheduled->Playing, Playing->Finished, Cancelled 전이를 감지한다 | VERIFIED | game-repository.ts L80-88: status diff check → StateTransition push; Tests 2/3/4 cover all transitions |
| 5 | upsert 시 is_notified_* 플래그가 덮어씌워지지 않아 중복 알림이 방지된다 | VERIFIED | game-repository.ts L58-68: payload omits is_notified_* fields; Test 6 asserts absence |
| 6 | games 테이블에 game_date+home_team+away_team 복합 unique 제약이 존재하여 경기 중복이 방지된다 | VERIFIED | migration SQL L17: `ADD CONSTRAINT uq_games_date_teams UNIQUE (game_date, home_team, away_team)`; game-repository.ts L72: `onConflict: 'game_date,home_team,away_team'` |
| 7 | 경기 상태가 DB에 영속화되어 서버 재시작에도 유지된다 (INFRA-03) | VERIFIED | Supabase upsert pattern in syncGames(); DB migration adds permanent schema; state held in DB not memory |
| 8 | QStash가 POST /api/cron/poll을 호출하면 kbo-game 크롤링 + DB 상태 전이 감지가 실행된다 | VERIFIED | route.ts L36-46: fetchTodayGames() then syncGames(result.games) |
| 9 | 유효하지 않은 QStash 서명으로 호출하면 401이 반환된다 | VERIFIED | route.ts L13-22: missing sig → 401; verify throws → 401 |
| 10 | 경기 시간대(14~22시 KST) 외에 호출하면 크롤링 없이 200이 반환된다 | VERIFIED | route.ts L30-33: `kstHour < 14 \|\| kstHour >= 22` → 200 early return |
| 11 | 크롤링 실패 시 500이 아닌 200을 반환하여 QStash 자동 재시도를 방지한다 | VERIFIED | route.ts L38-43: `!result.success` → logger.error + `status: 200` |
| 12 | setup-qstash.ts 스크립트로 3분 간격 Cron Schedule을 등록할 수 있다 | VERIFIED | scripts/setup-qstash.ts L27-30: `schedules.create({ cron: '*/3 5-13 * * *' })` |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/crawler.ts` | CrawlerResult, CrawlerGame, StateTransition, KboGameStatus 타입 | VERIFIED | All 4 types exported; 44 lines, substantive |
| `src/backend/modules/crawler/crawler-service.ts` | fetchTodayGames() — kbo-game 래핑, null/[] 분리 | VERIFIED | 49 lines, full implementation with null guard, error catch, date conversion |
| `src/backend/modules/crawler/game-repository.ts` | syncGames() — DB upsert + 상태 전이 감지 | VERIFIED | 93 lines, KST date calc, Map indexing, upsert loop, transition detection |
| `src/backend/modules/crawler/game-state-mapper.ts` | mapKboStatusToDb() — 대문자→소문자 상태 매핑 | VERIFIED | 17 lines, STATUS_MAP const, pure function |
| `src/backend/modules/crawler/index.ts` | crawler 모듈 public API re-export | VERIFIED | 3 re-exports: fetchTodayGames, syncGames, mapKboStatusToDb |
| `supabase/migrations/20260405000000_game_notified_flags.sql` | is_notified 상태별 분리 + 복합 unique 제약 | VERIFIED | ADD COLUMN x3, UPDATE migration, DROP COLUMN, ADD CONSTRAINT |
| `src/app/api/cron/poll/route.ts` | QStash 폴링 엔드포인트 | VERIFIED | 70 lines, Receiver, signature check, KST guard, crawler calls, Phase 3 contract |
| `src/app/api/cron/poll/__tests__/route.test.ts` | 폴링 엔드포인트 테스트 | VERIFIED | 7 tests, all passing |
| `scripts/setup-qstash.ts` | QStash Cron Schedule 등록 스크립트 | VERIFIED | Client.schedules.create, cron */3 5-13, env var guards |
| `.env.example` | QStash 환경변수 템플릿 | VERIFIED | QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY, APP_URL |
| `src/backend/modules/crawler/__tests__/crawler-service.test.ts` | CrawlerService + GameStateMapper 테스트 | VERIFIED | 9 tests (5 fetchTodayGames + 4 mapKboStatusToDb), all passing |
| `src/backend/modules/crawler/__tests__/game-repository.test.ts` | GameRepository 상태 전이 감지 테스트 | VERIFIED | 8 tests covering all transitions + upsert payload assertions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| crawler-service.ts | kbo-game | `import { getGame } from 'kbo-game'` | WIRED | L1 import, L12 `await getGame(new Date())` |
| crawler-service.ts | game-state-mapper.ts | `mapKboStatusToDb` import | WIRED | L3 import, L25 used in game.map() |
| game-repository.ts | supabase/server.ts | `createServerSupabaseClient` import | WIRED | L1 import, L30 `await createServerSupabaseClient()` |
| game-repository.ts | src/types/crawler.ts | StateTransition, CrawlerGame imports | WIRED | L4 `import type { CrawlerGame, StateTransition }` |
| poll/route.ts | crawler/index.ts | `import { fetchTodayGames, syncGames }` | WIRED | L2 import, L36 + L46 usage |
| poll/route.ts | @upstash/qstash | `new Receiver(...)` | WIRED | L1 import, L5 `new Receiver({...})`, L19 `receiver.verify(...)` |
| poll/route.ts | src/lib/logger.ts | `logger.error/info` | WIRED | L3 import, L41 `logger.error`, L56 `logger.info` |
| scripts/setup-qstash.ts | @upstash/qstash | `Client.schedules.create()` | WIRED | L9 import, L27 `client.schedules.create(...)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| crawler-service.ts | `games` (CrawlerGame[]) | `kbo-game` package `getGame(new Date())` | Yes — live KBO crawl | FLOWING |
| game-repository.ts | `dbGames` | `supabase.from('games').select('*').eq('game_date', today)` | Yes — DB query | FLOWING |
| game-repository.ts | transitions[] | comparison of `existingGame.status` vs `crawledGame.status` | Yes — real status diff | FLOWING |
| poll/route.ts | result, transitions | fetchTodayGames() + syncGames() | Yes — delegates to real crawler + repo | FLOWING |

### Behavioral Spot-Checks

Step 7b skipped for crawler-service.ts and game-repository.ts — both require live network (kbo-game) or live DB (Supabase). The test suite (41 tests, 6 suites, exit 0) serves as the behavioral verification proxy.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `pnpm test --run` | 41 passed (6 suites), exit 0 | PASS |
| TypeScript type check clean | `pnpm typecheck` | `tsc --noEmit` exit 0, no output | PASS |
| No console.log in source files | grep console.log in crawler/ and route.ts | No matches | PASS |
| is_notified not leaked to upsert | grep `is_notified(?!_)` in game-repository.ts | No matches | PASS |
| No TODO/FIXME/placeholder patterns in crawler module | grep across crawler/ | No matches | PASS |
| setup-qstash.ts exports correct cron pattern | Read scripts/setup-qstash.ts | `*/3 5-13 * * *` confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATA-01 | 02-01, 02-02 | 시스템은 kbo-game 패키지를 통해 당일 KBO 경기 데이터를 수집한다 | SATISFIED | crawler-service.ts `import { getGame } from 'kbo-game'`; fetchTodayGames() wraps getGame(new Date()) |
| DATA-02 | 02-01, 02-02 | 시스템은 경기 상태 전이(Playing → Finished)를 정확히 감지한다 | SATISFIED | game-repository.ts L80-88 status diff → StateTransition; Tests 2/3/4 verify Scheduled→Playing, Playing→Finished, Scheduled→Cancelled |
| DATA-03 | — | 8회 이후 폴링 주기 30초 단축 | DEFERRED | Per CONTEXT.md decision; not in phase 2 scope; REQUIREMENTS.md marks as Deferred post-MVP |
| DATA-04 | 02-01, 02-02 | 시스템은 크롤링 실패와 경기 없음을 구분하여 처리한다 | SATISFIED | CrawlerResult discriminated union: null→`{success:false,error}`, []→`{success:true,games:[]}` (different code paths) |
| INFRA-03 | 02-01 | 경기 상태는 DB에 영속화되어 서버 재시작에도 유지된다 | SATISFIED | Supabase upsert in syncGames(); DB migration creates persistent schema; no in-memory state |

**Note on DATA-03:** Correctly deferred per phase scope. REQUIREMENTS.md Traceability table documents this as "Deferred to post-MVP (per CONTEXT.md D-08)". Not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| scripts/setup-qstash.ts | 32-36 | `console.log` calls | Info | Setup script only — not production server code; acceptable for a one-shot CLI script |

No blockers found. The `console.log` usage in `scripts/setup-qstash.ts` is intentional user-facing output in a one-shot CLI tool and does not violate the CLAUDE.md `console.log` prohibition (which applies to production server code, not setup scripts).

### Human Verification Required

#### 1. Supabase DB Migration Applied

**Test:** Connect to the Supabase project and inspect the `games` table schema
**Expected:** `is_notified_start`, `is_notified_finish`, `is_notified_cancel` boolean columns exist; `uq_games_date_teams` unique constraint exists on `(game_date, home_team, away_team)`; old `is_notified` column does not exist
**Why human:** Requires live Supabase connection with service role credentials. Migration file is correct and complete; application is a matter of whether `supabase db push` or equivalent was run.

#### 2. QStash Cron Schedule Active

**Test:** Log into Upstash Console (https://console.upstash.com/qstash), navigate to Schedules tab
**Expected:** A schedule with cron `*/3 5-13 * * *` pointing to `{APP_URL}/api/cron/poll` is listed and active
**Why human:** External service verification — requires actual Upstash account credentials and deployed APP_URL

### Gaps Summary

No gaps. All 12 must-have truths are verified. All artifacts exist, are substantive, and are wired. All required key links are confirmed. All requirement IDs (DATA-01, DATA-02, DATA-04, INFRA-03) are satisfied. DATA-03 is correctly deferred per project decision.

Two human verification items remain for external service/DB state confirmation, but these do not block the phase goal — the code artifacts that enable those integrations are fully implemented and verified.

---

_Verified: 2026-04-05T07:20:00Z_
_Verifier: Claude (gsd-verifier)_
