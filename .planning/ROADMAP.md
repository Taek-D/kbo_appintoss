# Roadmap: KBO 야구 알리미

## Overview

DB 스키마와 토스 인증으로 기반을 다진 뒤, KBO 경기 데이터 크롤러와 폴링 워커를 구축하고, 토스 Push API 파이프라인을 완성한 후, 인터랙티브 경기 결과 화면으로 마무리한다. 각 페이즈는 다음 페이즈의 의존성을 완전히 해소하며 완료된다. 템플릿 검수 신청은 Phase 1과 병행하여 Day 1에 진행한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - DB 스키마 + 토스 인증 + 온보딩 UI + 템플릿 검수 신청
- [x] **Phase 2: Data Pipeline** - KBO 크롤러 + 폴링 워커 (TDD) (completed 2026-04-05)
- [ ] **Phase 3: Push Notification** - 토스 Push API mTLS + 순차 발송 큐 (TDD)
- [x] **Phase 4: Game Result UI** - GSAP/Lenis 인터랙티브 경기 결과 화면 + 통합 완성 (completed 2026-04-06)

## Phase Details

### Phase 1: Foundation
**Goal**: 유저가 토스 로그인으로 진입하여 응원팀을 선택하고 구독할 수 있으며, 서비스의 모든 데이터 계약(DB 스키마)이 확립된다
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, AUTH-01, AUTH-02, AUTH-03, AUTH-04, SUB-01, SUB-02
**Success Criteria** (what must be TRUE):
  1. 유저는 토스 로그인 버튼을 눌러 별도 회원가입 없이 서비스에 진입할 수 있다
  2. 유저는 10개 KBO 구단 중 하나를 선택하여 응원팀으로 저장할 수 있다
  3. 유저가 앱을 재진입하면 이전에 선택한 응원팀이 그대로 표시된다
  4. 유저는 응원팀을 변경하거나 알림 구독을 해제할 수 있다
  5. Supabase에 users, games, push_logs 테이블이 생성되고, 토스 Push 메시지 템플릿 검수가 신청된다
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — 프로젝트 스캐폴딩 + DB 스키마 마이그레이션 + 공유 타입 + Vitest 설정 + 템플릿 검수 신청
- [x] 01-02-PLAN.md — Auth 모듈 TDD (user-repository + toss-client + API Routes)
- [x] 01-03-PLAN.md — 온보딩 UI (로그인 + 팀 선택) + 메인 화면 + 구독 관리 UX

### Phase 2: Data Pipeline
**Goal**: 시스템이 KBO 경기 데이터를 실시간으로 수집하고, 경기 종료 시점을 정확하게 감지하며, 상태가 DB에 영속화된다
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-04, INFRA-03
**Success Criteria** (what must be TRUE):
  1. 시스템은 kbo-game 패키지(또는 대체 크롤러)를 통해 당일 KBO 경기 목록과 상태를 수집할 수 있다
  2. 폴링 워커가 Playing -> Finished 상태 전이를 감지하면 DB에 경기 종료가 기록된다
  3. 크롤링 실패(네트워크 오류)와 경기 없음(빈 배열)이 서로 다른 코드 경로로 처리된다
  4. 서버가 재시작되어도 경기 상태가 DB에서 복원되어 중복 알림이 발생하지 않는다
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — CrawlerService TDD (kbo-game 래핑, null/[] 분리) + GameRepository TDD (상태 전이 감지, Supabase upsert) + DB 마이그레이션
- [x] 02-02-PLAN.md — QStash 폴링 API Route TDD (서명 검증, KST 시간 체크) + QStash Cron Schedule 설정 스크립트 + 환경변수 문서화

### Phase 3: Push Notification
**Goal**: 경기 종료가 감지되는 즉시 해당 팀 구독자 전원에게 토스 푸시 알림이 Rate Limit을 준수하며 발송된다
**Depends on**: Phase 2
**Requirements**: PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05
**Success Criteria** (what must be TRUE):
  1. 경기 종료 감지 후 구독자에게 토스 Push 알림이 실제로 수신된다
  2. 알림 발송이 100ms 간격 순차 큐로 처리되어 Rate Limit 오류가 발생하지 않는다
  3. 동시에 2개 경기가 종료되어도 각 경기 발송이 서로 블로킹하지 않고 각각 완료된다
  4. mTLS 인증서 없이 Push API 호출 시 명시적 오류가 발생하고, 올바른 인증서로는 성공한다
  5. 발송 성공/실패 결과가 push_logs 테이블에 기록되어 확인할 수 있다
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Push 타입 정의 + Service Role 클라이언트 + PushProvider mTLS TDD (인증서 검증, API 통신, 에러 핸들링)
- [x] 03-02-PLAN.md — NotificationService TDD (구독자 조회, 순차 발송, push_logs, Promise.allSettled) + poll/route.ts 통합

### Phase 4: Game Result UI
**Goal**: 유저가 알림을 탭하면 인터랙티브한 경기 결과 화면이 표시되고, 응원팀에 오늘 경기가 없으면 적절한 안내 화면이 나타나며, 서비스 전체가 통합 완성된다
**Depends on**: Phase 3
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. 유저가 토스 알림을 탭하면 해당 경기의 결과 요약 화면으로 딥링크 이동된다
  2. 결과 화면에 최종 스코어와 이닝별 점수가 표시된다
  3. 스코어 카운트업 GSAP 애니메이션이 SSR 오류 없이 동작한다
  4. Lenis 기반 부드러운 스크롤이 전체 페이지에서 동작한다
  5. 응원팀 경기가 없는 날 "오늘 경기 없음" 화면이 표시되며, 서비스 전체가 토스 화이트톤 디자인으로 일관되게 구현된다
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — API Routes (games/today, games/[id]) + ScoreBoard/InningTable/GameCard 컴포넌트 TDD + /game/[id] 결과 페이지 (GSAP 카운트업 + Lenis 스크롤)
- [x] 04-02-PLAN.md — 메인 화면 경기 데이터 연동 (GameCard + 응원팀 강조 + 네비게이션) + 토스 디자인 통합 시각 검증

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Data Pipeline | 2/2 | Complete   | 2026-04-05 |
| 3. Push Notification | 1/2 | Executing | - |
| 4. Game Result UI | 2/2 | Complete   | 2026-04-06 |
