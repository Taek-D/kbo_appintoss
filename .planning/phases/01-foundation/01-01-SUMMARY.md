---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [next.js, supabase, vitest, typescript, tailwind, pino, postgresql]

# Dependency graph
requires: []
provides:
  - "Next.js 16 프로젝트 스캐폴딩 (TypeScript + Tailwind + App Router)"
  - "Supabase 클라이언트 설정 (server/client, @supabase/ssr)"
  - "공유 타입 정의 (TeamCode, User, Game, GameStatus, Toss 타입)"
  - "DB 마이그레이션 SQL (users, games, push_logs 테이블 + 인덱스 + 트리거)"
  - "Vitest + Testing Library + MSW 테스트 인프라"
  - "Pino 로거 (console.log 대체)"
  - "환경변수 템플릿 (.env.example)"
affects: [01-02, 01-03, 02-01, 02-02, 03-01, 03-02, 04-01, 04-02]

# Tech tracking
tech-stack:
  added: [next.js 16, react 19, typescript, tailwind css, @supabase/supabase-js, @supabase/ssr, zod, pino, vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/user-event, msw, vite-tsconfig-paths]
  patterns: [app-router, server-client-supabase-split, string-literal-unions, pino-logger]

key-files:
  created:
    - package.json
    - vitest.config.mts
    - vitest.setup.ts
    - src/types/user.ts
    - src/types/game.ts
    - src/types/toss.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/logger.ts
    - supabase/migrations/20260404000000_init_schema.sql
    - .env.example
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/types/__tests__/setup.test.ts
  modified: []

key-decisions:
  - "@supabase/ssr 사용 (deprecated auth-helpers-nextjs 대신)"
  - "enum 금지, 문자열 리터럴 유니온 패턴 적용 (TeamCode, GameStatus)"
  - "Pino 로거 기반 로깅 (console.log 금지)"

patterns-established:
  - "Type-only exports: 공유 타입은 src/types/ 디렉토리에 type 키워드로 정의"
  - "Supabase split: server.ts (cookies 연동) / client.ts (브라우저용) 분리"
  - "String literal unions: enum 대신 'HH' | 'OB' | 'LG' 등 리터럴 유니온 사용"
  - "Pino logging: 모든 로깅은 src/lib/logger.ts 경유"

requirements-completed: [INFRA-01]

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 1 Plan 01: Project Scaffolding Summary

**Next.js 16 스캐폴딩 + Supabase DB 마이그레이션(users/games/push_logs) + 공유 타입(TeamCode/Game/Toss) + Vitest 테스트 인프라**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-05T12:00:00+09:00
- **Completed:** 2026-04-05T12:17:36+09:00
- **Tasks:** 1 of 2 (Task 2 skipped by user)
- **Files created:** 30

## Accomplishments
- Next.js 16 + TypeScript + Tailwind CSS 프로젝트 초기화 완료
- Supabase 클라이언트 설정 (server/client @supabase/ssr 분리 패턴)
- 공유 타입 정의: TeamCode(10개 구단), User, Game, GameStatus, TossAuthResponse, TossUserInfo
- DB 마이그레이션 SQL: users, games, push_logs 3개 테이블 + 인덱스 3개 + updated_at 자동 갱신 트리거
- Vitest + Testing Library + MSW 테스트 인프라 구축 (setup.test.ts 통과 확인)
- Pino 로거 설정 (개발 환경 pino-pretty 지원)
- 환경변수 템플릿(.env.example) 작성

## Task Commits

Each task was committed atomically:

1. **Task 1: Next.js 프로젝트 스캐폴딩 + DB 스키마 + 공유 타입 + Vitest 설정** - `9696abb` (feat)
2. **Task 2: 토스 Push 메시지 템플릿 검수 신청** - SKIPPED (사용자가 나중에 직접 수행 예정)

## Files Created/Modified
- `package.json` - 프로젝트 의존성 및 스크립트 정의
- `tsconfig.json` - TypeScript 설정
- `vitest.config.mts` - Vitest 테스트 설정 (tsconfigPaths + react 플러그인, jsdom)
- `vitest.setup.ts` - Testing Library jest-dom/vitest 설정
- `src/types/user.ts` - TeamCode 리터럴 유니온, KBO_TEAMS 상수, User 타입
- `src/types/game.ts` - GameStatus 리터럴 유니온, Game 타입
- `src/types/toss.ts` - TossAuthResponse, TossUserInfo, TossReferrer 타입
- `src/types/__tests__/setup.test.ts` - 타입 및 테스트 인프라 검증 테스트
- `src/lib/supabase/server.ts` - 서버용 Supabase 클라이언트 (cookies 연동)
- `src/lib/supabase/client.ts` - 브라우저용 Supabase 클라이언트
- `src/lib/logger.ts` - Pino 기반 로거
- `supabase/migrations/20260404000000_init_schema.sql` - users, games, push_logs DDL + 인덱스 + 트리거
- `.env.example` - 환경변수 템플릿 (Supabase URL/Keys, Toss mTLS)
- `src/app/layout.tsx` - Next.js App Router 루트 레이아웃
- `src/app/page.tsx` - 메인 페이지 (placeholder)
- `next.config.ts` - Next.js 설정
- `eslint.config.mjs` - ESLint 설정
- `postcss.config.mjs` - PostCSS 설정
- `src/app/globals.css` - 전역 스타일 (Tailwind)

## Decisions Made
- @supabase/ssr 사용 (deprecated @supabase/auth-helpers-nextjs 대신) -- RESEARCH.md 권장 사항 반영
- enum 절대 금지, 문자열 리터럴 유니온 패턴 적용 -- CLAUDE.md 타입 컨벤션 준수
- Pino 로거 기반 로깅 (console.log 금지) -- CLAUDE.md 컨벤션 준수

## Deviations from Plan

### Task 2 Skipped

**Task 2: 토스 Push 메시지 템플릿 검수 신청** -- 사용자가 checkpoint에서 skip 선택.
- **사유:** 사용자가 나중에 직접 앱인토스 콘솔에서 수행 예정
- **영향:** INFRA-02 요구사항 미완료 상태로 유지. Push 알림 기능(Phase 3) 전까지 완료 필요
- **조치 필요:** Phase 3 시작 전 토스 Push 메시지 템플릿 검수 신청 및 승인 확인

그 외 자동 수정 사항 없음 -- Task 1은 계획대로 정확히 실행됨.

## Issues Encountered
None - Task 1은 문제 없이 완료됨.

## User Setup Required

**외부 서비스 설정이 필요합니다:**

1. **Supabase 프로젝트 생성** 후 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL` -- Supabase Dashboard > Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Supabase Dashboard > Settings > API > anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` -- Supabase Dashboard > Settings > API > service_role key

2. **Supabase DB 마이그레이션 실행:**
   - `supabase/migrations/20260404000000_init_schema.sql` 파일을 Supabase SQL Editor에서 실행

3. **토스 앱인토스 콘솔** (Phase 3 전까지):
   - `TOSS_MTLS_CERT` -- 앱인토스 콘솔 > 인증서 관리 > 인증서 다운로드 (base64)
   - `TOSS_MTLS_KEY` -- 앱인토스 콘솔 > 인증서 관리 > 개인키 다운로드 (base64)
   - Push 메시지 템플릿 검수 신청

## Known Stubs
None - 현 단계는 인프라 스캐폴딩으로, 데이터 바인딩이 필요한 UI 컴포넌트가 없음.

## Next Phase Readiness
- 공유 타입(TeamCode, User, Game, Toss 타입)이 01-02(Auth 모듈 TDD)에서 바로 import 가능
- Supabase 클라이언트(server/client)가 01-02에서 DB 연동에 사용 가능
- Vitest 인프라가 01-02 TDD에 즉시 활용 가능
- **주의:** 토스 Push 템플릿 검수(INFRA-02)가 미완료 -- Phase 3 시작 전 반드시 완료 필요

## Self-Check: PASSED

- [x] SUMMARY.md created: `.planning/phases/01-foundation/01-01-SUMMARY.md`
- [x] Commit 9696abb verified in git log
- [x] STATE.md updated (plan 2/3, progress 33%, decisions added)
- [x] ROADMAP.md updated (Phase 1: 1/3 plans, In Progress)
- [x] REQUIREMENTS.md updated (INFRA-01 marked complete)

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
