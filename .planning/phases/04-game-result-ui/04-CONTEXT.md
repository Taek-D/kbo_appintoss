# Phase 4: Game Result UI - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

알림 탭 시 인터랙티브 경기 결과 화면(/game/{gameId}) 구현, 메인 화면 실제 경기 데이터 연동(응원팀 강조 + 전체 경기 목록), GSAP 스코어 카운트업 애니메이션, Lenis 부드러운 스크롤, 토스 디자인 스타일 통합 마감. 서비스 전체를 출시 가능 상태로 완성한다.

</domain>

<decisions>
## Implementation Decisions

### 결과 화면 레이아웃
- **D-01:** 토스 카드 스타일 스코어보드 — 큰 스코어 중앙 배치, 팀 로고 좌우 대칭, rounded-2xl 카드 내부. 기존 코드베이스의 화이트톤 + bg-gray-50 패턴과 일관됨
- **D-02:** 이닝별 점수는 별도 카드에 테이블 형식으로 표시 (1~9회 + R 합계)

### 승패 표현
- **D-03:** 승리 강조 — 응원팀 승리 시 파란색(#0064FF) 액센트 + 세레브레이션 이펙트, 패배 시 차분한 톤. 감정적 연결 강화

### 애니메이션
- **D-04:** GSAP은 스코어 카운트업만 적용 — 최종 스코어가 0에서 카운트업. 토스 미니앱 성능 우선, 최소한의 핵심 모션에 집중
- **D-05:** Lenis는 결과 화면(/game/{id})에만 적용 — 다른 페이지는 기본 스크롤 유지. 토스 앱 내부 스크롤과의 충돌 방지

### 메인 화면 경기 연동
- **D-06:** 경기 상태 카드 — 예정(scheduled)/진행중(playing)/종료(finished) 상태별 다른 카드 UI. 종료된 경기 탭 시 /game/{gameId} 결과 화면으로 이동
- **D-07:** 전체 경기 목록 표시 — 응원팀 경기를 상단에 강조 배치, 아래에 다른 KBO 경기 목록 표시. 경기 없는 날은 기존 "오늘 경기 없음" UI 유지

### 딥링크 진입 UX
- **D-08:** 잘못된 gameId / 존재하지 않는 경기 → 메인 화면 자동 리디렉트. Phase 3 D-09에서 정의한 fallback 동선과 일치
- **D-09:** 뒤로가기는 항상 메인 화면으로 이동. 토스 미니앱 특성상 복잡한 네비게이션 스택 없이 단순한 동선 유지

### Claude's Discretion
- 스코어 카운트업 애니메이션 duration/easing 세부 설정
- 이닝별 테이블 스타일링 세부사항 (셀 크기, 폰트 사이즈)
- 결과 화면 스켈레톤/로딩 UI 디자인
- 경기 상태 카드 디자인 디테일 (색상, 아이콘, 간격)
- 전체 경기 목록의 정렬 순서 (시간순 등)
- 메인 화면 경기 데이터 API Route 설계

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — GSAP + Lenis 결정, 토스 화이트톤 UX, 핵심 가치
- `.planning/REQUIREMENTS.md` §경기 결과 UI — UI-01~UI-05 요구사항 정의
- `CLAUDE.md` — 모듈 분리 원칙, 타입 컨벤션, enum 금지, TDD 필수 구간

### 기존 코드 (Phase 4 연결점)
- `src/app/(main)/page.tsx` — 메인 화면. "오늘 경기 없음" placeholder를 실제 데이터로 교체 필요
- `src/components/SubscriptionControl.tsx` — 구독 관리 컴포넌트 (메인 화면에서 사용 중)
- `src/components/TeamGrid.tsx` — 팀 그리드 컴포넌트 (팀 로고/이름 참조)
- `src/types/game.ts` — GameStatus, Game 타입 (score, inning_data JSONB)
- `src/types/user.ts` — TeamCode, KBO_TEAMS (팀 코드/이름/로고 매핑)
- `src/backend/modules/crawler/game-repository.ts` — syncGames(), 경기 데이터 DB 접근
- `src/lib/supabase/server.ts` — 서버 사이드 Supabase 클라이언트
- `src/app/globals.css` — Tailwind v4, 화이트톤 CSS 변수
- `supabase/migrations/20260404000000_init_schema.sql` — games 테이블 스키마 (score, inning_data)

### 이전 Phase 컨텍스트
- `.planning/phases/03-push-notification/03-CONTEXT.md` — D-02: 알림에 스코어 미포함 (결과 화면 유도), D-09: /game/{gameId} 딥링크 구조
- `.planning/phases/01-foundation/01-CONTEXT.md` — 토스 디자인 스타일 (화이트톤, 둥근 모서리), 온보딩 플로우 패턴

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ConfirmModal.tsx`: 확인 모달 — 결과 화면 내 공유/닫기 등에 재사용 가능
- `src/components/TeamGrid.tsx`: 팀 로고/이름 데이터 — 결과 화면 팀 표시에 참조
- `src/types/user.ts > KBO_TEAMS`: 팀 코드→이름 매핑 배열 — 스코어보드에서 팀 이름 렌더링에 사용
- `src/app/(main)/page.tsx`: 메인 화면 기본 구조 (로딩/에러 상태 패턴, fetchUser 패턴)

### Established Patterns
- UI 스타일: `bg-white`, `rounded-2xl`, `bg-gray-50`, `text-[#0064FF]`, `min-h-dvh px-5 pt-12 pb-8`
- 상태 관리: `useState` + `useEffect` + `fetch` 직접 호출 (별도 상태 라이브러리 없음)
- 에러 처리: 에러 메시지 표시 + "다시 시도" 버튼 패턴
- 로딩: skeleton UI (`animate-pulse` + `bg-gray-100` div)
- 모듈 구조: `src/backend/modules/{name}/` with index.ts public API

### Integration Points
- 새 라우트: `src/app/(main)/game/[id]/page.tsx` — 경기 결과 페이지
- 새 API Route: `src/app/api/games/today/route.ts` — 오늘 경기 목록 조회 (메인 화면용)
- 새 API Route: `src/app/api/games/[id]/route.ts` — 개별 경기 상세 조회 (결과 화면용)
- 메인 화면 수정: `src/app/(main)/page.tsx` — 경기 데이터 연동
- 새 패키지: `gsap`, `lenis` — npm 의존성 추가 필요

</code_context>

<specifics>
## Specific Ideas

- 알림에 스코어를 넣지 않았으므로 결과 화면이 유저의 "결과 확인" 욕구를 충족하는 핵심 터치포인트 — 스코어 카운트업 애니메이션으로 기대감 연출
- 응원팀 승리 시 파란색 세레브레이션으로 감정적 리워드 제공, 패배 시 차분하게 처리하여 부정적 경험 최소화
- 전체 경기 목록을 보여줌으로써 "야구 팬"으로서의 정보 욕구도 함께 충족 — 응원팀 경기가 상단에 강조되므로 핵심 가치는 유지
- /game/{gameId}는 Phase 3에서 이미 딥링크로 Push 알림에 포함됨 — 페이지만 구현하면 자동 연결

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-game-result-ui*
*Context gathered: 2026-04-05*
