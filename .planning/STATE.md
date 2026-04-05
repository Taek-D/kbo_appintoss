---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-game-result-ui 04-01-PLAN.md
last_updated: "2026-04-05T14:42:00.000Z"
last_activity: 2026-04-05
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
  percent: 87
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** 응원팀 경기가 끝나는 즉시 유저에게 결과를 알려주는 것 — 빠르고 정확한 경기 종료 알림
**Current focus:** Phase 03 — push-notification

## Current Position

Phase: 4
Plan: 1 (Complete)
Status: Executing
Last activity: 2026-04-05

Progress: [████████░░] 87%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 15min | 1 tasks | 30 files |
| Phase 01 P02 | 5min | 2 tasks | 8 files |
| Phase 01 P03 | 6min | 3 tasks | 9 files |
| Phase 02 P01 | 8min | 2 tasks | 10 files |
| Phase 02-data-pipeline P02 | 8min | 2 tasks | 4 files |
| Phase 03-push-notification P01 | 15min | 1 tasks | 5 files |
| Phase 03-push-notification P02 | 12min | 2 tasks | 5 files |
| Phase 04-game-result-ui P01 | 15min | 2 tasks | 12 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: 토스 Push 메시지 템플릿 검수를 Day 1에 신청해야 함 (검수 지연 시 KBO 시즌 타이밍 윈도우 상실)
- Phase 2: kbo-game@0.0.2 검증 완료(2026-04-04) — getGame(Date)→Game[], 경기 상태(SCHEDULED/IN_PROGRESS/FINISHED/CANCELED), 스코어, 이닝 제공. k-skill 참고 문서 확인됨
- Phase 2: 폴링 워커는 Vercel Cron Jobs(1분 간격)으로 구현 결정(2026-04-04) — 별도 서버 불필요, 30초 폴링은 MVP 이후 최적화
- [Phase 02-01]: kbo-game@0.0.2 실제 타입: date는 Date 객체, score는 { home, away } 옵셔널 — RESEARCH.md 추정과 다름, score?.home ?? 0 패턴 적용
- [Phase 02-01]: is_notified → is_notified_start/finish/cancel 3분할 (D-06) — upsert 페이로드 제외로 알림 플래그 보존
- [Phase 02-01]: syncGames() onConflict: game_date,home_team,away_team 복합키 upsert — kbo-game id와 DB uuid 불일치 해결
- Phase 3: mTLS 인증서 발급 절차는 토스 콘솔 접속 후 직접 확인 필요
- [Phase 01]: @supabase/ssr 사용 (deprecated auth-helpers-nextjs 대신)
- [Phase 01]: enum 금지, 문자열 리터럴 유니온 패턴 적용 (TeamCode, GameStatus)
- [Phase 01]: Zod z.enum()으로 TeamCode 런타임 검증 (enum 금지 준수)
- [Phase 01]: session_token httpOnly secure cookie에 accessToken 직접 저장 (MVP 단순화)
- [Phase 01]: 토스 SDK는 window 글로벌 접근 래퍼로 구현 (npm 패키지 의존성 없이)
- [Phase 01]: Route Group 패턴: (auth)/(main) 분리하여 인증 상태별 레이아웃 차별화
- [Phase 02-data-pipeline]: [Phase 02-02]: QStash Receiver 모듈 레벨 싱글턴 초기화 — Vercel 서버리스 cold start 최적화
- [Phase 02-data-pipeline]: [Phase 02-02]: 크롤링 실패 시 200 반환으로 QStash 자동 재시도 방지 (D-01)
- [Phase 02-data-pipeline]: [Phase 02-02]: vi.hoisted()로 Receiver 생성자 모킹 — vitest 호이스팅 이슈 해결 패턴
- [Phase 03-01]: mTLS 인증서는 TOSS_MTLS_CERT/KEY 환경변수에 base64 인코딩 저장, Buffer.from(x, 'base64')로 런타임 디코딩 → https.Agent 전달
- [Phase 03-01]: createServiceRoleClient() 추가 — QStash webhook(poll/route.ts)은 cookies() 없어 createServerSupabaseClient() 사용 불가
- [Phase 03-01]: vitest 생성자 모킹 패턴 확립 — mockImplementation(function(this){Object.assign(this, instance)}) 사용
- [Phase 03-01]: TOSS_PUSH_API_URL 환경변수로 관리 — 하드코딩 방지, 테스트 오버라이드 가능
- [Phase 03-02]: 구독자 0명이어도 is_notified 플래그 업데이트 — 재폴링 시 중복 발송 방지
- [Phase 03-02]: Promise.allSettled() 병렬 테스트에서 mockFrom.mockImplementation(table=>) 패턴 — mockReturnValueOnce 큐 순서 불보장 문제 해결
- [Phase 03-02]: 템플릿 ID를 TOSS_TEMPLATE_ID_FINISHED/CANCELLED 환경변수로 관리 — 하드코딩 방지, 검수 전 mock값으로 동작
- [Phase 04-01]: gsap default import (import gsap from 'gsap') — named { gsap } import는 vitest mock 해석 불일치 발생
- [Phase 04-01]: vi.hoisted() 패턴으로 mock 변수 선언 — vi.mock 팩토리 호이스팅으로 인한 TDZ 에러 방지
- [Phase 04-01]: Lenis per-page 초기화 (useEffect + destroy) — 결과 화면에만 적용, 다른 페이지 영향 없음
- [Phase 04-01]: pnpm exec vitest --root <worktree> --config <worktree>/vitest.config.mts — worktree에 node_modules 없어 메인 레포 vitest 활용

### Pending Todos

None yet.

### Blockers/Concerns

- ~~kbo-game npm 패키지~~ ✅ 해결 (2026-04-04) — v0.0.2 확인, 프로젝트 요구사항 충족
- ~~토스 Push 템플릿 검수~~ ✅ 해결 (2026-04-04) — 앱 개발 완료 후 검수 신청 예정, 현재 블로커 아님
- ~~폴링 워커 호스팅~~ ✅ 해결 (2026-04-04) — Vercel Cron Jobs 1분 간격으로 결정, 별도 서버 불필요

## Session Continuity

Last session: 2026-04-05T14:42:00.000Z
Stopped at: Completed 04-game-result-ui 04-01-PLAN.md
Resume file: .planning/phases/04-game-result-ui/04-01-SUMMARY.md
