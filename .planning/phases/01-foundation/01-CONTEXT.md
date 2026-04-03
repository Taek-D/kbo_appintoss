# Phase 1: Foundation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

DB 스키마 확립(users, games, push_logs) + 토스 SDK 인증/로그인 + 응원팀 선택 온보딩 + 구독 관리(변경/해제) + 토스 Push 메시지 템플릿 검수 신청. 유저가 토스 로그인으로 진입하여 응원팀을 선택하고 구독할 수 있는 상태까지 완성한다.

</domain>

<decisions>
## Implementation Decisions

### 온보딩 플로우
- 2단계 구성: 토스 로그인 → 응원팀 선택 → 메인 화면
- 로그인 화면은 토스 로그인 버튼 + 간단한 한 줄 설명만 (비주얼/일러스트 없음)
- 응원팀 선택 = 알림 구독 암묵적 동의 (별도 동의 단계 없음)
- 재진입 시(이미 온보딩 완료 유저) 메인 화면에 응원팀의 오늘 경기 정보 표시
- 경기 없는 날은 "오늘 경기 없음" 안내

### DB 스키마
- **users**: 최소한 — id(UUID PK), toss_user_key(TEXT UNIQUE), team_code(TEXT), subscribed(BOOLEAN), created_at, updated_at
- **games**: 상태 중심 — id(UUID PK), game_date(DATE), home_team(TEXT), away_team(TEXT), status(TEXT: scheduled/playing/finished), home_score(INT), away_score(INT), inning_data(JSONB nullable), started_at, finished_at, created_at, updated_at
- **push_logs**: 간단 로그 — user_id, game_id, status(success/failed), error_message(nullable), sent_at

### 응원팀 선택 UI
- 5×2 그리드 레이아웃 (10개 구단 한 화면에 전체 표시, 스크롤 불필요)
- 각 카드에 팀 로고 이미지 + 팀명 표시
- 팀 탭 후 확인 단계 추가: "OO팀을 응원할까요?" 확인 버튼 → 저장 후 메인 화면 이동

### 구독 관리 UX
- 메인 화면 내에 현재 응원팀 표시 + 탭하면 변경/해제 옵션
- 구독 해제 시 확인 모달 표시: "알림을 그만 받을까요?"
- 응원팀 변경 시 온보딩의 팀 선택 화면을 그대로 재사용 (현재 팀 하이라이트 상태)

### Claude's Discretion
- team_code 포맷 (kbo-game 패키지가 사용하는 코드 기준으로 맞춤)
- 로딩 상태/스켈레톤 디자인
- 에러 상태 처리 (네트워크 오류 등)
- 토스 디자인 스타일 세부 적용 (화이트톤, 둥근 모서리, 간격)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- 아직 소스 코드 없음 (프로젝트 초기 단계)

### Established Patterns
- CLAUDE.md에 정의된 컨벤션: type 선호, enum 금지, Zod 검증, console.log 금지
- TDD 필수: Auth 모듈은 반드시 테스트 먼저 작성

### Integration Points
- Supabase PostgreSQL 연결 (마이그레이션으로 스키마 생성)
- 토스 SDK 로그인 연동
- 토스 콘솔에서 Push 메시지 템플릿 검수 신청

</code_context>

<specifics>
## Specific Ideas

- 토스 미니앱 내에서 동작하므로 이미 토스 앱 안에 있는 유저 — 로그인 화면은 최대한 간결하게
- 팀 선택은 실수 방지를 위해 확인 단계 포함하되, 전체 플로우는 2단계로 유지
- 메인 화면에서 응원팀 변경/해제를 바로 접근 가능하게 (별도 설정 페이지 불필요)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-03*
