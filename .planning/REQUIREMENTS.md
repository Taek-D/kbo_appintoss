# Requirements: KBO 야구 알리미

**Defined:** 2026-04-03
**Core Value:** 응원팀 경기가 끝나는 즉시 유저에게 결과를 알려주는 것

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### 인증 & 온보딩

- [ ] **AUTH-01**: 유저는 토스 로그인으로 별도 회원가입 없이 서비스에 진입할 수 있다
- [ ] **AUTH-02**: 유저는 10개 KBO 구단 중 하나를 응원팀으로 선택할 수 있다
- [ ] **AUTH-03**: 유저는 재진입 시 기존 응원팀 설정이 유지된다
- [ ] **AUTH-04**: 유저는 응원팀을 변경할 수 있다

### 데이터 수집

- [ ] **DATA-01**: 시스템은 kbo-game 패키지를 통해 당일 KBO 경기 데이터를 수집한다
- [ ] **DATA-02**: 시스템은 경기 상태 전이(Playing → Finished)를 정확히 감지한다
- [ ] **DATA-03**: 시스템은 8회 이후 폴링 주기를 30초로 단축하여 종료 시점을 빠르게 감지한다
- [ ] **DATA-04**: 시스템은 크롤링 실패와 경기 없음을 구분하여 처리한다

### 알림 발송

- [ ] **PUSH-01**: 경기 종료 감지 시 해당 팀 구독자에게 토스 푸시 알림을 발송한다
- [ ] **PUSH-02**: 알림 발송은 100ms 간격의 순차 큐로 Rate Limit을 준수한다
- [ ] **PUSH-03**: 동시에 여러 경기가 종료되어도 각 경기 발송이 서로 블로킹하지 않는다
- [ ] **PUSH-04**: mTLS 인증서를 통한 토스 Push API 인증이 정상 동작한다
- [ ] **PUSH-05**: 발송 결과 및 에러를 push_logs에 기록한다

### 경기 결과 UI

- [ ] **UI-01**: 유저는 알림 클릭 시 경기 결과 요약 화면을 볼 수 있다
- [ ] **UI-02**: 결과 화면에 최종 스코어와 이닝별 점수가 표시된다
- [ ] **UI-03**: 결과 화면에 GSAP 기반 스코어 카운트업 애니메이션이 동작한다
- [ ] **UI-04**: 페이지 전체에 Lenis 기반 부드러운 스크롤이 적용된다
- [ ] **UI-05**: 토스 디자인 스타일(화이트톤, 둥근 모서리)이 일관되게 적용된다

### 구독 관리

- [ ] **SUB-01**: 유저는 알림 구독을 해제할 수 있다
- [ ] **SUB-02**: 유저의 응원팀에 오늘 경기가 없으면 "오늘 경기 없음" 화면이 표시된다

### 인프라 & 검수

- [x] **INFRA-01**: Supabase에 users, games, push_logs 테이블이 구성된다
- [ ] **INFRA-02**: 토스 Push 메시지 템플릿이 검수를 통과한다
- [ ] **INFRA-03**: 경기 상태는 DB에 영속화되어 서버 재시작에도 유지된다

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### 확장 기능

- **EXT-01**: 유저는 여러 팀을 동시에 구독할 수 있다
- **EXT-02**: 유저는 지난 경기 알림 수신 이력을 확인할 수 있다
- **EXT-03**: 경기 없는 날 다음 경기 예고가 표시된다
- **EXT-04**: 결과 화면 하단에 팀 순위가 표시된다

## Out of Scope

| Feature | Reason |
|---------|--------|
| 실시간 중계 / 라이브 스코어 | MVP 범위 초과, 폴링 비용 급증, 토스 미니앱 UX 부적합 |
| 댓글 / 커뮤니티 | 모더레이션 필요, 검수 복잡도 증가, YAGNI |
| 하이라이트 영상 | KBO 중계권 저작권 리스크, 대용량 미디어 UX 부적합 |
| 경기 예측 / 베팅 | 토스 플랫폼 명시 금지 항목 (도박성 콘텐츠) |
| 선수별 상세 스탯 | MVP 초과, 토스 미니앱 맥락 부적합 |
| 마케팅 푸시 알림 | 정보통신망법상 별도 동의 필요, 온보딩 마찰 증가 |
| 카카오톡 알림톡 | 토스 생태계 이탈, 인증 이중화 불필요 |
| 모바일 네이티브 앱 | 토스 미니앱으로 충분, 별도 앱 불필요 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| SUB-01 | Phase 1 | Pending |
| SUB-02 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| PUSH-01 | Phase 3 | Pending |
| PUSH-02 | Phase 3 | Pending |
| PUSH-03 | Phase 3 | Pending |
| PUSH-04 | Phase 3 | Pending |
| PUSH-05 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after roadmap creation*
