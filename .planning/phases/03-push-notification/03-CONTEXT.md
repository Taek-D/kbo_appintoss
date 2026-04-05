# Phase 3: Push Notification - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

경기 상태 전이(종료/취소) 감지 즉시 해당 팀 구독자 전원에게 토스 Push 알림을 Rate Limit(100ms 간격)을 준수하며 발송한다. mTLS 인증서로 토스 Push API에 인증하고, 발송 결과를 push_logs에 기록한다.

</domain>

<decisions>
## Implementation Decisions

### 알림 메시지 내용
- **D-01:** 메시지 톤은 친근한 구어체 — "경기가 끝났어요!", "경기가 취소되었어요" 스타일. 토스 앱 내 대화형 UX와 자연스럽게 어울리는 톤
- **D-02:** 경기 종료 알림에 스코어를 포함하지 않음 — "경기가 끝났어요! 탭해서 확인해보세요" 형식으로 결과 화면 클릭 유도. Phase 4 결과 화면의 가치를 높임
- **D-03:** 경기 시작 알림은 발송하지 않음 — Phase 2 D-05를 수정. 종료(finished)와 취소(cancelled)만 알림 발송. 핵심 가치는 "경기 결과 알림"이며, 시작 알림은 알림 피로감 유발. is_notified_start 플래그는 Phase 3에서 사용하지 않음

### 발송 큐 아키텍처
- **D-04:** API Route 내 순차 실행 — poll/route.ts에서 for-of 루프로 구독자 순회하며 100ms delay 후 발송. BullMQ/Redis 불필요, 인프라 추가 없음
- **D-05:** Vercel Hobby 플랜(함수 타임아웃 10초) 사용 — 구독자 ~80명까지 처리 가능 (80×100ms=8초). MVP 초기 규모에 충분
- **D-06:** 동시 경기 종료 시 Promise.allSettled로 병렬 처리 유지 — 각 경기의 구독자 발송은 병렬로 실행. 각 경기 내부는 순차 발송. PROJECT.md Key Decision 유지

### 발송 실패 처리
- **D-07:** 개별 유저 발송 실패 시 push_logs에 기록 후 스킵 — 재시도 없음. 경기 종료 알림은 시간이 지나면 의미가 없으므로 재시도 실익 적음
- **D-08:** Rate Limit 초과(429) 응답 시 1초 대기 후 해당 유저부터 재시도하고 나머지 발송 계속 — 10초 타임아웃 내 처리 가능성 고려 필요

### 알림 클릭 딥링크
- **D-09:** 결과 페이지 URL 선설계 — /game/{gameId} 구조를 Phase 3에서 정의하고 알림에 포함. Phase 3 시점에는 해당 페이지가 없으므로 메인 화면으로 fallback, Phase 4에서 페이지 구현 시 자동 연결. 토스 템플릿 재검수 불필요

### Claude's Discretion
- mTLS 인증서 로딩 방식 (환경변수 base64 인코딩 등 Vercel 서버리스 환경에 맞게)
- PushProvider 인터페이스 설계 세부사항
- 구독자 조회 쿼리 최적화 (users 테이블 team_code + subscribed 조건)
- 토스 Push API 요청/응답 타입 정의
- push_logs 기록 시점 및 배치 처리 여부
- /game/{gameId} fallback 라우팅 구현 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — 토스 Push API mTLS 인증 필수, Rate Limit 100ms, Promise.allSettled 결정, TDD 필수
- `.planning/REQUIREMENTS.md` §알림 발송 — PUSH-01~PUSH-05 요구사항 정의
- `CLAUDE.md` — TDD 필수 구간(Toss Push Provider), 모듈 분리 원칙, 타입 컨벤션, enum 금지

### 기존 코드 (Phase 3 연결점)
- `src/app/api/cron/poll/route.ts` — Phase 3 Handoff Contract (lines 47-55). transitions 순회하며 Push 발송 연결점 명시
- `src/types/crawler.ts` — StateTransition 타입 (gameId, fromStatus, toStatus, game)
- `src/types/game.ts` — Game 타입 (is_notified_start/finish/cancel 플래그 포함)
- `src/backend/modules/crawler/game-repository.ts` — syncGames()가 StateTransition[] 반환
- `supabase/migrations/20260404000000_init_schema.sql` — push_logs 테이블 스키마 (user_id, game_id, status, error_message, sent_at)
- `supabase/migrations/20260405000000_game_notified_flags.sql` — is_notified_start/finish/cancel 3개 플래그 마이그레이션
- `src/lib/supabase/server.ts` — 서버 사이드 Supabase 클라이언트 패턴

### 이전 Phase 컨텍스트
- `.planning/phases/01-foundation/01-CONTEXT.md` — users 테이블 스키마 (toss_user_key, team_code, subscribed), 모듈 구조 패턴
- `.planning/phases/02-data-pipeline/02-CONTEXT.md` — D-05 수정됨(시작 알림 제외), D-06 is_notified 3-flag 분리, QStash 인증 패턴

### 외부 참조
- 토스 Push API 문서 — mTLS 인증, 메시지 발송, Rate Limit 규격
- 토스 Push 메시지 가이드라인 — 문장형, 특수문자 자제

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/crawler.ts`: StateTransition 타입 — poll/route.ts에서 Push 발송 트리거로 직접 사용
- `src/types/game.ts`: Game 타입 (is_notified_* 플래그) — 중복 알림 방지에 사용
- `src/lib/supabase/server.ts`: 서버 사이드 Supabase 클라이언트 — 구독자 조회, push_logs 기록
- `src/lib/logger.ts`: 로거 — 발송 결과 로깅
- `src/backend/modules/auth/`: 모듈 구조 패턴 (index.ts public API, `__tests__/` 디렉토리) — push 모듈도 동일 패턴 적용
- `src/lib/toss-sdk.ts`: 토스 SDK 래퍼 — Push API 인증에 참고 가능

### Established Patterns
- 모듈 분리: `src/backend/modules/{name}/` 구조, index.ts에서 public API export
- 타입 정의: `src/types/` 디렉토리에 모듈 간 공유 타입
- 테스트: `__tests__/` 디렉토리에 `.test.ts` 파일
- enum 금지 → 문자열 리터럴 유니온 + Zod z.enum() 런타임 검증
- QStash 서명 검증 패턴 (Receiver 모듈 레벨 싱글턴)

### Integration Points
- `src/app/api/cron/poll/route.ts` lines 47-55 — transitions 순회 후 Push 발송 로직 삽입 지점
- `users` 테이블 — team_code + subscribed=true 조건으로 구독자 조회
- `games` 테이블 — is_notified_finish/cancel 플래그 업데이트
- `push_logs` 테이블 — 발송 결과 기록

</code_context>

<specifics>
## Specific Ideas

- 알림 메시지에 스코어를 넣지 않고 "탭해서 확인" 유도 — Phase 4 결과 화면의 engagement 극대화
- 경기 시작 알림 제외로 알림 피로감 최소화 — 핵심 가치 "경기 결과 알림"에 집중
- Vercel Hobby 10초 타임아웃 내 처리를 전제로 설계 — 구독자 80명 상한. Pro 전환 시 500명까지 확장 가능
- /game/{gameId} URL 선설계로 Phase 4와의 자연스러운 연결 — 템플릿 재검수 없이 결과 화면 추가 가능

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-push-notification*
*Context gathered: 2026-04-05*
