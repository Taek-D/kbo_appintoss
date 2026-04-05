# Phase 2: Data Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 02-data-pipeline
**Areas discussed:** Fallback 전���, 상태 전이 범위, Cron 실행 전략, 데이터 보존 정책

---

## Fallback 전략

### Q1: kbo-game 패키지 실패 시 어떻게 대응할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 재시도만 (추천) | 패키지 실패 시 다음 Cron에서 자동 재시도. 네이버 크롤러 미구현. kbo-game이 KBO 공식 API 사용하므로 안정적 | ✓ |
| 네이버 크롤러 대체 | 연속 3회 실패 시 네이�� 스포츠 크롤러로 자동 전환. 복잡도 증가하지만 가용성 높음 | |
| 인터페이스만 준비 | CrawlerService 인터페이스 설계 후 MVP에서는 kbo-game만 구현. 나중에 네이버 크롤러 추가 가능 | |

**User's choice:** 재시도만
**Notes:** 없음

### Q2: kbo-game 실패 시 에러 로그는 어떻게 남길까요?

| Option | Description | Selected |
|--------|-------------|----------|
| DB 로그만 (추천) | 크롤링 실패 시 games 테이블 업데이트 없이 다음 Cron에서 재시도. 에러는 로거로 기록 | ✓ |
| DB + 어드민 알림 | 에러 연속 N회 발생 시 어드민에게 알림. 운영 모니터링 편의 | |
| Claude에게 맡김 | 에러 처리 세부는 Claude가 적절히 구현하도록 위임 | |

**User's choice:** DB 로그만
**Notes:** 없음

---

## 상태 전이 범위

### Q3: 어떤 상태 전이를 감지하고 DB에 ���록할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| Finished만 감지 (추천) | Playing→Finished 전이만 추적. MVP 목적(경기 종료 알림)에 충실 | |
| 모든 전이 감지 | Scheduled→Playing, Playing→Finished, Cancelled 모두 이벤트로 감지 | ✓ |
| Finished + Cancelled | 경기 종료와 취소만 이벤트로 감지 | |

**User's choice:** 모든 전이 감지
**Notes:** 없음

### Q4: Phase 3��서 푸시 알림을 보낼 전이는?

| Option | Description | Selected |
|--------|-------------|----------|
| Playing→Finished (필수) | 경기 종료 시 알림 — 서비스 핵심 기능 | ✓ |
| Scheduled→Playing | 경기 시작 시 알림 — "응원팀 경기가 시작되었습니다" | ✓ |
| Cancelled/취소 | 경기 취소 시 알림 — "오늘 경기가 취소되었습���다" | ✓ |

**User's choice:** 3가지 전이 모두 선택 (multiSelect)
**Notes:** 없음

---

## Cron 실행 전���

### Q5: Vercel Cron 실행 시간대를 어떻게 설정할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 경기 시간대만 (추천) | 14:00~22:00 KST만 실행 | |
| 24시간 상시 | 항상 실행 | |
| 스마트 스케줄링 | 시간대별 분리 운영 | |

**User's choice:** Other — "나 Vercel Hobby 플랜인데 어떻게 설정하는게 좋아? 간격도 더 늘리는게 좋을까?"
**Notes:** Vercel Hobby 플랜 제한 확인 필요 → 조사 진행

### Q5b: Vercel Hobby 플랜에서 Cron 제한을 어떻게 해결할까요?

(웹 조사 결과: Vercel Hobby Cron은 하루 1회만 가능, 1시간 오차)

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash QStash (추천) | 무료 500회/일. 경기 시간대 1분 간격 = 480회로 무료 범위 내 | ✓ |
| cron-job.org | 완전 무료, 1분 간격 가능. 30초 타임아웃, 외부 서비스 의존 | |
| Vercel Pro 업그레이드 | $20/월 유료. 네이티브 Cron으로 가장 단순 | |

**User's choice:** Upstash QStash (간격은 늘리고 싶다는 의견 추가)
**Notes:** 30분은 어떤지 문의 → 핵심 가치("즉시 알림")와 충돌하므로 더 짧은 간격 권장

### Q5c: QStash 폴링 간격을 어떻게 설정할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 1분 (추천) | 핵심 가치에 가장 충실. 480회/일로 무료 한도 근접 | |
| 3분 | 160회/일로 넓은 여유. 최대 3분 지연 | ✓ |
| 5분 | 96회/일. 안정적이지만 체감 속도 다소 떨어짐 | |

**User's choice:** 3분
**Notes:** 없음

### Q5d: 경기 시간대 외에는 어떻게 할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 경기 시간대만 (추천) | 14:00~22:00 KST만 실행. 비경기 시간 완전 중지 | ✓ |
| 24시간 상시 | 3분 간격이면 하루 480회. 무료 한도 내이지만 여유 적음 | |
| Claude에게 맡김 | KBO 경기 스케줄 패턴에 맞춰 Claude가 설정 | |

**User's choice:** 경기 시간���만
**Notes:** 없음

---

## 데이터 보존 정책

### Q6: 경기 데이터를 얼마나 보존할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 시즌 내 누적 (추천) | 2026 시즌 전체 경기 데이터 유지. 시즌 종료 후 아카이브 검토 | ✓ |
| 당일만 유지 | 매일 자정 전날 데이터 삭제. DB 가벼우나 지난 경기 조회 불가 | |
| 무기한 보존 | 모든 경기 데이터 영구 보존. Supabase Free 500MB 제한 고려 필요 | |

**User's choice:** 시즌 내 누적
**Notes:** 없음

---

## Claude's Discretion

- CrawlerService 인터페이스 설계 세부사항
- QStash 인�� 방식 (CRON_SECRET 또는 QStash 서명 검증)
- 폴링 API Route 경로 및 구조
- 에러 재시도 시 exponential backoff ���용 여부
- is_notified 플래그 상태별 분리 여부

## Deferred Ideas

- 8회 이후 30초 폴링 주기 단축 (DATA-03) — MVP 이후 최적화
- 네이버 스포츠 크롤러 fallback — MVP 미구현
