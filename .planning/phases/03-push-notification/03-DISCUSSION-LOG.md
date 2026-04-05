# Phase 3: Push Notification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 03-push-notification
**Areas discussed:** 알림 메시지 내용, 발송 큐 아키텍처, 발송 실패 처리, 알림 클릭 딥링크

---

## 알림 메시지 내용

### 메시지 톤

| Option | Description | Selected |
|--------|-------------|----------|
| 친근한 구어체 (추천) | "경기가 끝났어요!" 스타일. 토스 앱 내 대화형 UX와 자연스럽게 어울림 | ✓ |
| 간결한 정보형 | "삼성 5:3 LG — 경기 종료" 스타일. 핵심 정보만 빠르게 전달 | |
| 감정적 팬 스타일 | "삼성 승리!" 스타일. 응원팀 기준 승패 감정 표현 | |

**User's choice:** 친근한 구어체
**Notes:** 토스 앱 내 대화형 UX와 자연스럽게 어울리는 톤 선택

### 승패 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 스코어만 표시 (추천) | "5:3으로 삼성이 이겼습니다" — 중립적 정보 전달 | |
| 응원팀 기준 승패 감정 | "삼성 승리!" 또는 "아쉽지만 다음에" — 팀별 감정 대응 | |
| 스코어 없이 종료만 | "경기가 끝났어요! 탭해서 확인해보세요" — 결과 화면 클릭 유도 | ✓ |

**User's choice:** 스코어 없이 종료만
**Notes:** Phase 4 결과 화면의 가치를 높이기 위해 알림에서는 결과 유도만

### 경기 시작 알림

| Option | Description | Selected |
|--------|-------------|----------|
| 종료/취소만 (추천) | 핵심 가치 "경기 결과 알림"에 집중. 알림 피로감 최소화. D-05 수정 | ✓ |
| 세 가지 모두 발송 | Phase 2 D-05 결정대로 시작/종료/취소 모두 알림 | |
| 종료만 발송 | MVP 최소화. 취소도 알림 없음 | |

**User's choice:** 종료/취소만
**Notes:** Phase 2 D-05 결정을 수정. 경기 시작 알림은 알림 피로감 유발 우려

---

## 발송 큐 아키텍처

### 순차 발송 구현 방식

| Option | Description | Selected |
|--------|-------------|----------|
| API Route 내 순차 실행 (추천) | for-of 루프로 100ms delay 후 발송. BullMQ/Redis 불필요 | ✓ |
| Upstash Redis + 순차 큐 | RPUSH/LPOP 패턴으로 enqueue/dequeue. 타임아웃 문제 없음 | |
| QStash 개별 호출 | 구독자별 QStash publish. 무료 한도(500회/일) 소진 우려 | |

**User's choice:** API Route 내 순차 실행
**Notes:** BullMQ/Redis 불필요로 인프라 단순화

### Vercel 플랜

| Option | Description | Selected |
|--------|-------------|----------|
| Hobby (무료) | 함수 타임아웃 10초. 구독자 ~80명까지 처리 가능 | ✓ |
| Pro (유료) | 함수 타임아웃 60초. 구독자 ~500명까지 처리 가능 | |
| 아직 미정 | 두 경우 모두 대응하도록 구현 | |

**User's choice:** Hobby (무료)
**Notes:** MVP 초기 규모에 충분

### 동시 경기 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 병렬 처리 유지 (추천) | Promise.allSettled로 경기별 병렬 발송. PROJECT.md 결정 유지 | ✓ |
| 순차 처리로 변경 | 경기 A 완료 후 경기 B. 단순하지만 총 구독자 수 감소 | |

**User's choice:** 병렬 처리 유지
**Notes:** PROJECT.md Key Decision 유지

---

## 발송 실패 처리

### 개별 실패 정책

| Option | Description | Selected |
|--------|-------------|----------|
| 로그 후 스킵 (추천) | push_logs에 실패 기록 후 다음 유저로. 재시도 없음 | ✓ |
| 즉시 1회 재시도 | 실패 시 1회 재시도 후 여전히 실패면 로그 후 스킵 | |
| 별도 재시도 큐 | 실패 건을 모아 후처리. MVP 과잉 | |

**User's choice:** 로그 후 스킵
**Notes:** 경기 종료 알림은 시간이 지나면 의미 없으므로 재시도 실익 적음

### Rate Limit 초과 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 잠시 대기 후 계속 (추천) | 429 응답 시 1초 대기 후 해당 유저부터 재시도 | ✓ |
| 전체 중단 | Rate Limit 초과 시 남은 발송 전체 중단 | |
| 로그 후 스킵 | 429 받은 유저만 스킵하고 나머지 계속 | |

**User's choice:** 잠시 대기 후 계속
**Notes:** 10초 타임아웃 내 처리 가능성 고려 필요

---

## 알림 클릭 딥링크

### 랜딩 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 결과 페이지 URL 선설계 (추천) | /game/{gameId} 구조 선정의. Phase 3에서는 fallback, Phase 4에서 연결 | ✓ |
| 메인 화면으로 고정 | 항상 '/'로 이동. Phase 4에서 수정 시 템플릿 재검수 가능 | |
| Claude에게 맡김 | 구현 시 Claude가 적절히 판단 | |

**User's choice:** 결과 페이지 URL 선설계
**Notes:** Phase 4와의 자연스러운 연결. 토스 템플릿 재검수 불필요

---

## Claude's Discretion

- mTLS 인증서 로딩 방식
- PushProvider 인터페이스 설계 세부사항
- 구독자 조회 쿼리 최적화
- 토스 Push API 요청/응답 타입 정의
- push_logs 기록 시점 및 배치 처리 여부
- /game/{gameId} fallback 라우팅 구현 방식

## Deferred Ideas

None — discussion stayed within phase scope
