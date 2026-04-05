# Phase 4: Game Result UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 04-game-result-ui
**Areas discussed:** 결과 화면 레이아웃, 애니메이션 범위와 강도, 메인 화면 경기 연동, 딥링크 진입 UX

---

## 결과 화면 레이아웃

### 스코어보드 디자인

| Option | Description | Selected |
|--------|-------------|----------|
| 토스 카드 스타일 | 큰 스코어 중앙 배치, 팀 로고 좌우 대칭, rounded-2xl 카드. 기존 화이트톤 + bg-gray-50 패턴과 일관 | ✓ |
| 네이버 스포츠 스타일 | 스코어 상단 바, 이닝별 타임라인 형식. 야구 중계 느낌이지만 토스 디자인과 이질적 | |
| 미니멀 카드 | 최종 스코어만 크게, 이닝 점수는 아코디언으로 숨김. 깔끔하지만 정보 접근성 낮음 | |

**User's choice:** 토스 카드 스타일
**Notes:** 기존 코드베이스 UI 패턴(rounded-2xl, bg-gray-50)과의 일관성 중시

### 승패 표현

| Option | Description | Selected |
|--------|-------------|----------|
| 승리 강조 | 응원팀 승리 시 파란색 액센트 + 세레브레이션 이펙트, 패배 시 차분한 톤 | ✓ |
| 중립적 표시 | 승패 관계없이 동일한 디자인 | |
| 양팀 가벼운 차이 | 응원팀 스코어만 약간 크게 표시하는 정도 | |

**User's choice:** 승리 강조
**Notes:** 감정적 연결 강화를 위해 승리/패배에 시각적 차이

---

## 애니메이션 범위와 강도

### GSAP 모션 강도

| Option | Description | Selected |
|--------|-------------|----------|
| 스코어 카운트업만 | UI-03 충족. 최종 스코어 0→N 카운트업. 토스 미니앱 성능 최소화 | ✓ |
| 카운트업 + 이닝 순차 등장 | 스코어 카운트업 후 이닝 테이블 행이 순차 fade-in | |
| 풀 모션 경험 | 카운트업 + 이닝 순차 + 카드 입장 + 승리 시 confetti | |

**User's choice:** 스코어 카운트업만
**Notes:** 토스 미니앱 성능 우선, 핵심 모션에 집중

### Lenis 스크롤 적용 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 결과 화면만 | /game/{id}에만 Lenis 적용. 다른 페이지는 기본 스크롤 유지 | ✓ |
| 전체 앱 적용 | layout.tsx에서 전역 Lenis Provider. 일관되지만 토스 앱 스크롤 충돌 가능 | |

**User's choice:** 결과 화면만
**Notes:** 토스 앱 내부 스크롤 충돌 방지

---

## 메인 화면 경기 연동

### 경기 정보 표시 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 경기 상태 카드 | 예정/진행중/종료 상태별 다른 카드 UI. 종료 탭 시 결과 화면 이동 | ✓ |
| 스코어 요약만 | 경기 종료 시 스코어만 간략 표시 | |
| Claude에게 맡김 | Claude가 적절히 판단 | |

**User's choice:** 경기 상태 카드
**Notes:** 상태별 시각적 구분으로 직관적인 UX

### 다른 팀 경기 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 응원팀 경기만 | 핵심 가치에 집중, 단순한 UX | |
| 전체 경기 목록 | 응원팀 상단 강조 + 아래에 전체 목록 | ✓ |

**User's choice:** 전체 경기 목록
**Notes:** 야구 팬으로서의 정보 욕구 충족, 응원팀 강조로 핵심 가치 유지

---

## 딥링크 진입 UX

### Fallback 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 메인 화면 리디렉트 | 잘못된 gameId → 메인 화면 자동 이동. Phase 3 D-09 fallback 동선과 일치 | ✓ |
| 에러 페이지 표시 | "경기 정보를 찾을 수 없어요" + 메인으로 돌아가기 버튼 | |
| Claude에게 맡김 | Claude가 적절히 판단 | |

**User's choice:** 메인 화면 리디렉트
**Notes:** Phase 3 D-09 fallback 동선 일치

### 뒤로가기 동선

| Option | Description | Selected |
|--------|-------------|----------|
| 메인 화면으로 | 항상 메인 화면. 단순한 네비게이션 | ✓ |
| 브라우저 히스토리 사용 | router.back(). 진입 경로에 따라 다름 | |

**User's choice:** 메인 화면으로
**Notes:** 토스 미니앱 특성상 단순한 동선

---

## Claude's Discretion

- 스코어 카운트업 duration/easing
- 이닝별 테이블 스타일링
- 결과 화면 스켈레톤/로딩 UI
- 경기 상태 카드 디자인 디테일
- 전체 경기 목록 정렬 순서
- 메인 화면 경기 데이터 API Route 설계

## Deferred Ideas

None
