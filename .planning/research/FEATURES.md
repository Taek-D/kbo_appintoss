# Feature Landscape

**Domain:** KBO 경기 종료 알림 서비스 (토스 미니앱)
**Researched:** 2026-04-03
**Confidence:** MEDIUM — KBO app ecosystem verified via App Store/Play Store listings and MyKBO documentation; Toss mini-app constraints verified via official 앱인토스 platform page; ESPN/MLB patterns verified via official support docs.

---

## Table Stakes

Features users expect from a sports notification service. Missing any of these and users perceive the product as broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 응원팀 선택 (Team subscription) | 모든 야구 앱의 기본 — 팀을 고르지 않으면 개인화가 없음 | Low | 토스 로그인 후 최초 1회 설정. v1은 단일 팀만 지원 |
| 경기 종료 푸시 알림 | 서비스의 핵심 가치 명제. 없으면 서비스 자체가 성립 안 함 | High | 토스 Push API 사용. 메시지 템플릿 검수 2~3 영업일 필요 |
| 경기 결과 요약 화면 | 알림을 탭했을 때 결과가 없으면 이탈. MyKBO, ESPN 모두 제공 | Medium | 이닝별 점수, 최종 스코어, 승패 투수 최소 표시 |
| 최종 스코어 표시 | 스코어보드는 모든 야구 앱의 공통 UI 패턴 | Low | 팀 로고, 점수, 이닝별 득점 행 |
| 구독 해제 (알림 끄기) | 정보통신망법상 기능성 푸시도 수신 해제 경로 명시 의무 | Low | 토스 공식 가이드에서 명시적으로 요구 |
| 경기 없는 날 처리 | 팀이 오늘 경기가 없을 때 빈 화면이면 혼란 | Low | "오늘 경기 없음" 상태 화면 필요 |
| 빠른 온보딩 | 토스 생태계 특성상 3단계 이내 진입이 기대됨 (토스 로그인 → 팀 선택 → 완료) | Low | 토스 로그인으로 별도 회원가입 불필요 — 이것 자체가 이미 마찰 제거 |

---

## Differentiators

기본 기대치를 넘어서 사용자가 재방문하거나 타인에게 추천하게 만드는 기능.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 즉시성 강조 UX ("방금 끝났어요") | 경기 종료 직후 몇 초 안에 알림이 오는 경험 자체를 마케팅 포인트로 삼기 | Low (UX 카피) | 알림 문구에 "방금 경기가 끝났습니다" 류의 시제 활용. 기술적 난이도 낮으나 체감 차별화 큼 |
| 인터랙티브 경기 요약 애니메이션 | GSAP + Lenis 기반 스코어 카운트업, 이닝 전환 모션 | Medium | 토스 고유의 부드러운 모션 UX 재현. 단순 텍스트 결과보다 공유 욕구 자극 |
| 가변 폴링 기반 빠른 감지 | 8회 이후 30초 폴링으로 종료 시점 오차 최소화 | Medium | 사용자에게 보이지 않지만 "빠르다"는 인식을 만드는 핵심 인프라 |
| 경기 없는 날 다음 경기 예고 | 오늘 경기 없을 때 "다음 경기: X월 X일 OO vs OO" 표시 | Low | 빈 화면 방지 + 재방문 동기 부여 |
| 시즌 전체 팀 간단 순위 표시 | 결과 화면 하단에 현재 팀 순위 한 줄 표시 | Low | KBO 공식 API 또는 kbo-game 패키지 활용 가능성 검토 필요 |
| 알림 수신 이력 | 지난 경기 결과를 앱 내에서 다시 볼 수 있는 히스토리 | Medium | Supabase에 발송 이력 저장 시 구현 가능. 사용자가 알림을 놓쳤을 때 유용 |

---

## Anti-Features

명시적으로 만들지 않아야 할 기능들. 범위를 지키는 것이 품질 유지의 핵심.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 실시간 중계 / 라이브 스코어 업데이트 | 구현 복잡도 급증, 폴링 비용 증가, 토스 미니앱 내 UX에 맞지 않는 화면 구성 | 경기 종료 후 최종 결과만 표시. "실시간"이 필요한 사용자는 공식 KBO 앱으로 유도 |
| 다중 팀 구독 | v1에서 구독 로직, 알림 라우팅, UI 복잡도 2-3배 증가 | 단일 팀 선택. 향후 수요 검증 후 v2에서 추가 |
| 댓글 / 커뮤니티 기능 | 콘텐츠 모더레이션 필요, 토스 검수 복잡도 증가, YAGNI | 없음 — 반응 공유는 토스 카카오톡/SNS 공유로 대체 |
| 하이라이트 영상 / 미디어 | 저작권 리스크 (KBO 중계권), 미니앱 내 대용량 미디어 UX 부적합 | 텍스트 + 숫자 기반 결과 요약으로 대체 |
| 경기 예측 / 베팅 기능 | 토스 플랫폼 명시 금지 항목 (도박성 콘텐츠) | 절대 구현 불가 |
| 선수별 상세 스탯 | MVP 초과, 탭-딥-다이브 UX는 토스 미니앱 맥락에 부적합 | 팀 단위 결과만. 향후 확장 검토 |
| 마케팅 푸시 알림 | 정보통신망법상 별도 마케팅 수신 동의 필요 — 온보딩 마찰 증가 | 기능성 푸시(경기 종료 알림)만 발송. 마케팅성 메시지 금지 |
| 카카오톡 알림톡 | 토스 생태계 이탈, 인증 체계 이중화 | 토스 Push API 단일화 |

---

## Feature Dependencies

```
토스 로그인 (인증)
  └── 팀 선택 (구독 등록)
        └── 경기 종료 푸시 발송
              └── 경기 결과 요약 화면
                    └── 알림 수신 이력 (optional, v2)

kbo-game 패키지 (크롤러)
  └── 폴링 워커 (경기 상태 감지)
        └── 경기 종료 푸시 발송
              └── 메시지 템플릿 검수 (선행 필요 — 개발과 병행)

팀 선택
  └── 구독 해제 (알림 끄기)
  └── 경기 없는 날 처리
  └── 다음 경기 예고 (differentiator)
```

---

## Toss Mini-App Context: Platform-Specific Constraints

토스 플랫폼 특성이 피처 설계에 미치는 영향.

| Constraint | Impact on Features |
|------------|-------------------|
| 메시지 템플릿 검수 2~3 영업일 | 알림 문구를 초기에 확정해야 함. 런칭 전 검수 완료가 임계 경로 |
| 기능성 푸시는 별도 마케팅 동의 불필요 | 온보딩 단계 축소 가능 — 팀 선택만으로 알림 수신 시작 가능 |
| 토스 디자인 시스템 (TDS) 제공 | 별도 디자인 작업 최소화. 화이트톤 + 둥근 모서리 + 부드러운 모션 기본 제공 |
| 토스 로그인 내장 | 회원가입 화면 불필요 — 온보딩 마찰 최소화 |
| 미니앱 내 검색 가능 | 앱 발견성(discoverability)은 토스 플랫폼이 처리 — 별도 마케팅 랜딩 불필요 |
| Push API mTLS 인증 필수 | 인증서 관리 인프라 필요. 개발 초기에 설정 완료해야 함 |
| Push 발송 간격 100ms 이상 | 동시 다수 알림 시 순차 큐 필수 — 단순 Promise.all 불가 |

---

## MVP Recommendation

**MVP에 포함할 것 (Table Stakes 전체):**
1. 토스 로그인 → 팀 선택 → 구독 완료 (3단계 온보딩)
2. 경기 종료 푸시 알림 (기능성 푸시, 검수 선행)
3. 알림 탭 시 경기 결과 요약 화면 (최종 스코어 + 이닝별 점수)
4. 구독 해제 (알림 끄기)
5. 경기 없는 날 처리 화면

**MVP에 추가 권장 (비용 대비 효과 높은 Differentiators):**
- 즉시성 강조 알림 문구 (카피 수준, 개발 비용 없음)
- 인터랙티브 스코어 애니메이션 (GSAP — 토스 스타일 재현, 체감 차별화 큼)
- 경기 없는 날 다음 경기 예고 (Low complexity, 재방문 유도)

**MVP에서 제외할 것:**
- 알림 수신 이력 (Medium complexity, v2로 이연)
- 팀 순위 표시 (데이터 소스 검증 필요, v2로 이연)
- 다중 팀 구독 (v2)

---

## Sources

- MyKBO App Store listing: https://apps.apple.com/us/app/korean-baseball-stats-mykbo/id1107341048 (HIGH confidence — official listing)
- 앱인토스 플랫폼 소개: https://toss.im/apps-in-toss (MEDIUM confidence — marketing page)
- 앱인토스 푸시 알림 개발자 커뮤니티: https://techchat-apps-in-toss.toss.im/t/id/3220 (MEDIUM confidence — official community)
- ESPN Alerts support: https://support.espn.com/hc/en-us/articles/115003858572 (HIGH confidence — official docs)
- Sportico spoiler-free notifications article: https://www.sportico.com/business/tech/2026/streaming-mlb-apple-espn-spoiler-notification-settings-1234888192/ (MEDIUM confidence)
- KBO 공식 앱 Play Store: https://play.google.com/store/apps/details?id=com.sports2i.kbo (MEDIUM confidence — listing summary)
- 야구 앱 추천 커뮤니티 (더쿠 등): https://theqoo.net/kbaseball/2101193738 (LOW confidence — community, corroborates patterns)
