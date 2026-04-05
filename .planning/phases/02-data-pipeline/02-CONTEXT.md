# Phase 2: Data Pipeline - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

시스템이 KBO 경기 데이터를 실시간으로 수집하고, 경기 상태 전이(Scheduled→Playing, Playing→Finished, Cancelled)를 정확하게 감지하며, 상태가 DB에 영속화된다. Upstash QStash를 통해 3분 간격으로 Vercel API Route를 호출하여 폴링한다.

</domain>

<decisions>
## Implementation Decisions

### Fallback 전략
- **D-01:** kbo-game 패키지 실패 시 네이버 스포츠 크롤러 대체 없이 다음 폴링에서 자동 재시도만 수행
- **D-02:** 크롤링 에러는 기존 `src/lib/logger.ts` 로거를 통해 DB에 기록. 어드민 알림 없음 (MVP)
- **D-03:** kbo-game만 사용, fallback 크롤러 구현 없음. 패키지가 KBO 공식 API를 사용하므로 안정적

### 상태 전이 범위
- **D-04:** 모든 상태 전이를 감지하고 DB에 기록 — Scheduled→Playing(경기 시���), Playing→Finished(경기 종료), Cancelled(취소)
- **D-05:** 세 가지 전이 모두 Phase 3에서 푸시 알림 트리거 대상 — 경기 시작/종료/취소 각각 다른 메시지 발송
- **D-06:** `is_notified` 플래그(games 테이블에 이미 존재)로 중복 알림 방지. 상태별로 별도 플래그가 필요할 수 있음 — 구현 시 판단

### Cron 실행 전략
- **D-07:** Vercel Hobby 플랜 Cron 제한(하루 1회)으로 인해 **Upstash QStash**를 외부 Cron 스케줄러로 사용
- **D-08:** 3분 간격 폴링 — 무료 한도(500회/일) 대비 160회/일로 충분한 여유. 핵심 가치("즉시 알림")와 비용의 밸런스
- **D-09:** 경기 시간대(14:00~22:00 KST)에만 실행. 비경기 시간대에는 QStash 호출 없음
- **D-10:** Vercel Cron이 아닌 QStash Cron Schedule을 사용하므로 `vercel.json` cron 설정 대신 QStash Dashboard 또는 API로 스케줄 관리

### 데이터 보존 정책
- **D-11:** 시즌 내 모든 경기 데이터 누적 보존. 시즌 종료 후 아카이브 여부는 별도 검토
- **D-12:** Supabase Free 500MB DB 제한 고려하되 KBO 시즌 경기 수(~720경기) 수준에서는 문제없음

### Claude's Discretion
- CrawlerService 인터페이스 설계 세부사항 (kbo-game 래핑 방식)
- QStash 인증 (CRON_SECRET 또는 QStash 서명 검증 방식)
- 폴링 API Route 경로 및 구조
- 에러 재시도 시 exponential backoff 적용 여부
- is_notified 플래그를 상태별로 분리할지 단일 플래그로 유지할지

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — kbo-game@0.0.2 확인 결과, Vercel Cron→QStash 전환 결정, 가변 폴링 결정
- `.planning/REQUIREMENTS.md` §데이터 수집 — DATA-01~DATA-04 요구사항 정의
- `CLAUDE.md` — TDD 필수 구간(Crawler, Polling Worker), 모듈 분리 원칙, 타입 컨벤션

### 기존 코드
- `src/types/game.ts` — GameStatus 타입, Game 타입 정의 (is_notified 포함)
- `src/lib/supabase/server.ts` — 서버 사이드 Supabase 클라이언트 패턴
- `src/lib/logger.ts` — 로거 구현체
- `src/backend/modules/auth/index.ts` — 모듈 public API export 패턴 참고
- `supabase/migrations/20260404000000_init_schema.sql` — games 테이블 스키마, idx_games_date_status 인덱스

### 외부 참조
- kbo-game npm 패키지(v0.0.2) — `getGame(Date)` → `Game[]`, Date 객체 필수
- Upstash QStash 문서 — Cron Schedule, 서명 검증, Vercel 통합

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/game.ts`: GameStatus(`'scheduled' | 'playing' | 'finished' | 'cancelled'`), Game 타입 — 크롤러와 워커에서 그대로 사용
- `src/lib/supabase/server.ts`: 서버 사이드 Supabase 클라이언트 — API Route에서 DB 접근 시 사용
- `src/lib/logger.ts`: 로거 — 크롤링 에러 기록에 활용
- `src/backend/modules/auth/`: 모듈 구조 패턴 (`index.ts` public API, `__tests__/` 디렉토리) — crawler 모듈도 동일 패턴 적용

### Established Patterns
- 모듈 분리: `src/backend/modules/{name}/` 구조, index.ts에서 public API export
- 타입 정의: `src/types/` 디렉토리에 모듈 간 공유 타입
- 테스트: `__tests__/` 디렉토리에 `.test.ts` 파일
- enum 금지 → 문자열 리터럴 유니온 + Zod z.enum() 런타임 검증
- @supabase/ssr 사용

### Integration Points
- 새 API Route (`src/app/api/cron/` 등) — QStash가 호출할 폴링 엔드포인트
- `games` 테이블 — 크롤링 데이터 upsert, 상태 전이 감지 시 업데이트
- Phase 3 연결점 — 상태 전이 감지 후 이벤트를 Phase 3 Push 모듈로 전달

</code_context>

<specifics>
## Specific Ideas

- kbo-game@0.0.2의 `getGame(Date)` 함수는 문자열이 아닌 Date 객체를 인자로 받아야 함 — k-skill/kbo-results 참고
- Vercel Hobby 플랜 Cron 제한(하루 1회, 1시간 오차)으로 인해 Upstash QStash 선택됨
- 핵심 가치 "즉시 알림"과 비용 밸런스로 3분 간격 결정 — 30분은 너무 길고, 1분은 무료 한도에 근접
- 모든 상태 전이 감지 + 모든 전이에 대해 푸시 알림 발송 — 단순히 경기 종료만이 아닌 시작/취소도 알림

</specifics>

<deferred>
## Deferred Ideas

- 8회 이후 30초 폴링 주기 단축 (DATA-03) — MVP 이후 최적화로 결정됨 (PROJECT.md Key Decisions)
- 네이버 스포츠 크롤러 fallback — MVP에서 구현하지 않으나 CrawlerService 인터페이스로 확장 가능

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-04-05*
