# Roadmap: KBO 야구 알리미

## Overview

DB 스키마와 토스 인증으로 기반을 다진 뒤, KBO 경기 데이터 크롤러와 폴링 워커를 구축하고, 토스 Push API 파이프라인을 완성한 후, 인터랙티브 경기 결과 화면으로 마무리한다. 각 페이즈는 다음 페이즈의 의존성을 완전히 해소하며 완료된다. 템플릿 검수 신청은 Phase 1과 병행하여 Day 1에 진행한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - DB 스키마 + 토스 인증 + 온보딩 UI + 템플릿 검수 신청
- [ ] **Phase 2: Data Pipeline** - KBO 크롤러 + 가변 폴링 워커 (TDD)
- [ ] **Phase 3: Push Notification** - 토스 Push API mTLS + 순차 발송 큐 (TDD)
- [ ] **Phase 4: Game Result UI** - GSAP/Lenis 인터랙티브 경기 결과 화면 + 통합 완성

## Phase Details

### Phase 1: Foundation
**Goal**: 유저가 토스 로그인으로 진입하여 응원팀을 선택하고 구독할 수 있으며, 서비스의 모든 데이터 계약(DB 스키마)이 확립된다
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, AUTH-01, AUTH-02, AUTH-03, AUTH-04, SUB-01, SUB-02
**Success Criteria** (what must be TRUE):
  1. 유저는 토스 로그인 버튼을 눌러 별도 회원가입 없이 서비스에 진입할 수 있다
  2. 유저는 10개 KBO 구단 중 하나를 선택하여 응원팀으로 저장할 수 있다
  3. 유저가 앱을 재진입하면 이전에 선택한 응원팀이 그대로 표시된다
  4. 유저는 응원팀을 변경하거나 알림 구독을 해제할 수 있다
  5. Supabase에 users, games, push_logs 테이블이 생성되고, 토스 Push 메시지 템플릿 검수가 신청된다
**Plans**: TBD

Plans:
- [ ] 01-01: DB 스키마 설계 및 Supabase 마이그레이션 (users, games, push_logs) + 토스 콘솔 앱 등록 + 검수 신청
- [ ] 01-02: 토스 SDK 로그인 + 응원팀 선택 온보딩 UI + 구독/해제 기능

### Phase 2: Data Pipeline
**Goal**: 시스템이 KBO 경기 데이터를 실시간으로 수집하고, 경기 종료 시점을 정확하게 감지하며, 상태가 DB에 영속화된다
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. 시스템은 kbo-game 패키지(또는 대체 크롤러)를 통해 당일 KBO 경기 목록과 상태를 수집할 수 있다
  2. 폴링 워커가 Playing → Finished 상태 전이를 감지하면 DB에 경기 종료가 기록된다
  3. 8회 이후 폴링 주기가 30초로 자동 단축되어 종료 시점을 빠르게 감지한다
  4. 크롤링 실패(네트워크 오류)와 경기 없음(빈 배열)이 서로 다른 코드 경로로 처리된다
  5. 서버가 재시작되어도 경기 상태가 DB에서 복원되어 중복 알림이 발생하지 않는다
**Plans**: TBD

Plans:
- [ ] 02-01: CrawlerService 인터페이스 + kbo-game 패키지 검증 및 래핑 (TDD — 패키지 불가 시 네이버 스포츠 크롤러로 대체)
- [ ] 02-02: BullMQ 기반 가변 폴링 워커 + 상태 전이 감지 + DB 영속화 (TDD) + 퍼시스턴트 프로세스 배포 (Fly.io/Railway)

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
**Plans**: TBD

Plans:
- [ ] 03-01: mTLS 인증서 설정 + PushProvider 구현 (TDD — rate limit, 인증서 만료, 에러 케이스)
- [ ] 03-02: BullMQ 순차 발송 큐 + Promise.allSettled 동시 경기 처리 + push_logs 기록

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
**Plans**: TBD

Plans:
- [ ] 04-01: 경기 결과 페이지 (스코어 + 이닝 데이터) + GSAP 카운트업 애니메이션 + Lenis 스크롤 (SSR 가드 포함)
- [ ] 04-02: 딥링크 라우팅 + "오늘 경기 없음" 화면 + 토스 디자인 시스템 적용 + E2E 통합 검증

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Data Pipeline | 0/2 | Not started | - |
| 3. Push Notification | 0/2 | Not started | - |
| 4. Game Result UI | 0/2 | Not started | - |
