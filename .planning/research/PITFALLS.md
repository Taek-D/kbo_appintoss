# Domain Pitfalls

**Domain:** KBO 경기 종료 알림 서비스 (토스 미니앱)
**Researched:** 2026-04-03
**Overall confidence:** MEDIUM — Toss platform constraints sourced from official docs; kbo-game package internals inferred from crawling patterns; polling/concurrency from engineering literature.

---

## Critical Pitfalls

Mistakes that cause launch failure, data loss, or full rewrites.

---

### Pitfall 1: 템플릿 검수 없이 개발 완료 후 오픈 시도

**What goes wrong:**
토스 기능성 푸시/알림은 메시지 템플릿 문구 검수를 통과한 후에만 실제 발송이 가능하다. 검수는 영업일 기준 2-3일 소요되며, 주말/공휴일에는 진행되지 않는다. 개발을 완료하고 나서 검수를 신청하면, KBO 시즌 초반의 타이밍 윈도우를 놓칠 수 있다.

**Why it happens:**
"개발이 끝나면 검수 신청하면 되겠지"라는 순차적 사고. 템플릿이 확정되어야 검수를 신청할 수 있다는 것을 알지만, 개발 중 문구가 바뀔까봐 미룬다.

**Consequences:**
- 개발 완료 후 최소 3-5 영업일 지연
- KBO 개막전 알림 서비스 불가
- 문구 변경 시 재검수 필요 (추가 2-3일)

**Prevention:**
개발 1일차에 메시지 템플릿 문구를 확정하고 즉시 검수 신청한다. 템플릿은 최대한 범용적으로 작성하여 변경 필요성을 최소화한다 (예: 팀명 변수화).

**Detection (warning signs):**
- 개발 스프린트에 "템플릿 검수 신청" 태스크가 없음
- 메시지 문구가 "나중에 확정하자"로 미뤄져 있음

**Phase:** 프로젝트 시작 직후 (Day 1), Push Provider 모듈 구현과 병렬 진행

---

### Pitfall 2: mTLS 인증서 만료로 인한 무중단 서비스 장애

**What goes wrong:**
토스 Push API는 mTLS 기반 S2S 통신이 필수다. 인증서 유효 기간은 390일이며, 만료 시 모든 푸시 발송이 즉시 `ERR_NETWORK`로 실패한다. 인증서가 만료되는 순간 사용자에게 아무 알림도 가지 않는다.

**Why it happens:**
초기 설정 후 "390일이면 충분하다"고 방심. 운영 모니터링에 인증서 만료 알림이 없으면 조용히 서비스가 죽는다.

**Consequences:**
- 무음 장애 — 폴링은 정상 동작하나 푸시가 전혀 발송되지 않음
- 사용자는 왜 알림이 안 오는지 알 수 없음
- 인증서 재발급 및 재배포까지 서비스 다운

**Prevention:**
1. 인증서 발급 즉시 만료일을 달력에 등록하고 D-30, D-7, D-1 알림 설정
2. 토스 콘솔에서 인증서 2개 이상 등록 (무중단 교체 지원)
3. 교체 절차: 신규 인증서 발급 → 배포 → 구 인증서 폐기
4. CI/CD 파이프라인에 인증서 만료일 체크 스크립트 추가

**Detection (warning signs):**
- Push API 호출이 `ERR_NETWORK`로 일괄 실패
- 폴링 로그는 정상인데 `push_logs` 테이블에 성공 레코드가 없음

**Phase:** Toss Push Provider 모듈 구현 시 (인증서 로드 로직에 만료일 로깅 포함)

---

### Pitfall 3: kbo-game 패키지의 크롤링 실패를 감지하지 못함

**What goes wrong:**
`kbo-game` 패키지는 KBO 공식 사이트를 크롤링하는 서드파티 패키지다. KBO 사이트 구조 변경, 서버 점검, 네트워크 오류 시 패키지가 빈 배열 또는 `undefined`를 반환할 수 있다. 이 상황을 검증하지 않으면 "경기 없음"으로 오인하고 폴링을 조기 중단할 수 있다.

**Why it happens:**
외부 패키지를 신뢰하고 반환값 검증을 생략. 특히 빈 배열 `[]`은 정상 응답처럼 보이지만 크롤링 실패와 구분되지 않는다.

**Consequences:**
- 진행 중인 경기를 "오늘 경기 없음"으로 처리하고 폴링 중단
- 경기 종료 알림 미발송
- 로그 없이 조용히 실패

**Prevention:**
1. 크롤러 반환값에 최소 유효성 검사 적용 — `games.length === 0`이면 KBO 공식 일정 API 또는 이전 상태와 교차 검증
2. 연속 N회(예: 3회) 빈 배열 반환 시 알림(Slack/Discord) 발송
3. 크롤링 성공/실패 여부를 `crawler_health` 테이블에 적재
4. 패키지 버전을 고정(`package-lock.json`)하고 자동 업데이트 비활성화

**Detection (warning signs):**
- 폴링 로그에 "games fetched: 0" 연속 출력
- KBO 공식 사이트에서는 경기 진행 중인데 크롤러 결과는 비어 있음

**Phase:** KBO Crawler Module TDD 구현 시 (빈 배열/null 케이스 테스트 필수)

---

## Moderate Pitfalls

### Pitfall 4: 동시 경기 종료 시 Rate Limit 위반

**What goes wrong:**
KBO는 하루 최대 5경기가 동시에 종료될 수 있다. 각 경기에 구독자가 1,000명이라면 5,000건의 푸시를 거의 동시에 발송해야 한다. 토스 Push API는 발송 간격 100ms 이상을 요구한다. `Promise.all`로 병렬 발송하면 rate limit에 걸려 대량 실패한다.

**Prevention:**
1. `p-limit` 또는 자체 큐로 발송 간격 100ms 강제 적용
2. `Promise.allSettled` 사용 — 하나의 경기 발송 실패가 다른 경기 발송을 블로킹하지 않도록
3. 발송 실패 건은 `push_logs`에 `failed` 상태로 기록하고 재시도 큐에 삽입
4. 워크스페이스 발송 한도(10만 건/사업자) 소진 여부 모니터링

**Phase:** Toss Push Provider 모듈 구현 시

---

### Pitfall 5: 폴링 중 경기 상태 "깜빡임" (일시적 Finished 후 복구)

**What goes wrong:**
KBO 데이터 소스(kbo-game 크롤링 대상)는 경기 종료 직후 수 초간 상태가 `Finished`로 나왔다가 다시 `Playing`으로 돌아오는 현상이 발생할 수 있다 (데이터 소스 갱신 경쟁 조건). 단순 `Playing → Finished` 전이 1회 감지만으로 알림을 발송하면 경기가 끝나지도 않았는데 "경기 종료" 알림이 발송된다.

**Prevention:**
1. 상태 전이 더블체크 — `Finished` 감지 후 30초 뒤 재확인 후 발송
2. 발송 여부를 DB에 `is_notified` 플래그로 관리하여 중복 발송 방지
3. 발송 전 `game_end_score`가 확정 값인지 (0-0이 아닌지) 검증

**Phase:** Smart Polling Worker 구현 시

---

### Pitfall 6: 메모리 내 상태 비교의 서버 재시작 취약성

**What goes wrong:**
설계서에는 "상태 전이 로직(Playing → Finished)을 메모리 내에서 비교"라고 명시되어 있다. Vercel의 서버리스 환경 또는 Next.js API Route는 콜드 스타트 또는 배포 시 메모리가 초기화된다. 재시작 시 모든 경기의 이전 상태가 `undefined`가 되어, 현재 `Finished`인 경기를 "방금 종료됨"으로 오판하고 중복 알림을 발송할 수 있다.

**Prevention:**
1. 이전 경기 상태를 메모리가 아닌 Supabase DB(`game_states` 테이블)에 저장
2. 폴링 Worker는 시작 시 DB에서 마지막 알려진 상태를 로드
3. `is_notified = true`인 경기는 재발송 방지 로직으로 스킵
4. Vercel Cron 대신 장기 실행이 가능한 별도 Worker 서비스 고려

**Phase:** Smart Polling Worker 설계 시 (Vercel 배포 방식 확정 전에 결정)

---

### Pitfall 7: 기능성 메시지에 마케팅 성격 문구 혼입

**What goes wrong:**
토스 기능성 알림에 "지금 확인하세요!", "놓치지 마세요!" 같은 행동 유도 문구나 이벤트 홍보 내용을 포함하면, 토스 측에서 광고성 메시지로 분류하여 검수 거부 또는 발송 중단 조치를 내린다.

**Prevention:**
1. 메시지 문구 기준: 순수 정보 전달만 포함 (팀명, 스코어, 경기 결과)
2. 예시 통과 문구: "[팀명]이(가) 경기를 마쳤어요. 최종 스코어를 확인해 보세요."
3. 예시 실패 문구: "지금 바로 결과 확인! 오늘 이벤트도 놓치지 마세요 🎉"
4. 특수문자, 이모지, 느낌표 남용 자제 (토스 UX Writing 가이드라인 준수)

**Phase:** 템플릿 설계 및 검수 신청 시 (Day 1)

---

## Minor Pitfalls

### Pitfall 8: userKey 세션 만료 후 갱신 로직 누락

**What goes wrong:**
토스 로그인 세션이 만료된 후 재진입하는 사용자의 `userKey`가 변경될 수 있다. 구 `userKey`로 푸시를 발송하면 토스 API가 오류를 반환하고, 사용자는 구독 상태이지만 알림을 받지 못한다.

**Prevention:**
1. Auth 모듈에 로그인 갱신 시 `userKey` 업데이트 로직 포함
2. 토스 Push API 에러 코드 중 "유효하지 않은 userKey" 케이스를 별도 처리하여 해당 구독 비활성화

**Phase:** Auth & User Module 구현 시

---

### Pitfall 9: kbo-game 패키지 내부 의존성 및 버전 잠금 미적용

**What goes wrong:**
`kbo-game` 패키지 자체가 KBO 공식 사이트의 HTML 구조에 의존하는 크롤러다. 패키지 업데이트 없이 KBO 사이트가 변경되면 파싱이 깨진다. 반대로 패키지가 자동 업데이트되어 인터페이스가 바뀌면 래퍼 모듈이 런타임에 깨진다.

**Prevention:**
1. `package.json`에 정확한 버전 고정 (캐럿 `^` 사용 금지)
2. 패키지 반환 타입을 TypeScript 인터페이스로 선언하고 TDD로 검증
3. KBO 시즌 시작 전 패키지 동작 검증 테스트 실행

**Phase:** KBO Crawler Module TDD 구현 시

---

### Pitfall 10: 비시즌 / 우천 취소 경기의 폴링 처리 미비

**What goes wrong:**
경기가 우천취소, 콜드게임 종료, 또는 비시즌인 경우 폴링 Worker가 종료 조건을 만나지 못하고 무한 대기 상태에 빠질 수 있다. 서버 비용과 불필요한 크롤링 부하가 발생한다.

**Prevention:**
1. 경기 상태 목록에 `Cancelled`, `Postponed`, `RainDelay` 케이스 명시적 처리
2. 경기 시작 예정 시각 + N시간 이내에 종료 상태가 감지되지 않으면 폴링 자동 종료
3. KBO 공식 일정 기반으로 "오늘 경기 없음" 조기 판단 로직 추가

**Phase:** Smart Polling Worker 구현 시

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| 프로젝트 킥오프 | 템플릿 검수를 개발 후로 미룸 | Day 1에 문구 확정 및 검수 신청 |
| Push Provider 구현 | mTLS 인증서 만료 모니터링 없음 | 만료일 알림 + 이중 인증서 등록 |
| Crawler Module 구현 | 빈 배열 반환을 정상으로 처리 | 연속 실패 감지 및 헬스체크 |
| Polling Worker 구현 | 메모리 상태 의존 + 깜빡임 오발송 | DB 상태 영속화 + 더블체크 |
| Push 발송 로직 | 동시 다발 발송 Rate Limit 위반 | 100ms 간격 큐 + allSettled |
| 메시지 작성 | 광고성 문구로 검수 거부 | 순수 정보 전달 문구만 사용 |
| Vercel 배포 | 콜드 스타트로 상태 초기화 → 중복 발송 | DB 기반 상태 관리로 전환 |

---

## Sources

- [앱인토스 개발자센터 — API 사용하기 (mTLS)](https://developers-apps-in-toss.toss.im/development/integration-process.html) — HIGH confidence (official docs)
- [앱인토스 개발자센터 — 이해하기 (스마트 메시지)](https://developers-apps-in-toss.toss.im/smart-message/intro.html) — HIGH confidence (official docs, fetched directly)
- [앱인토스 개발자 커뮤니티 — 푸시/알림 글자 수 제한](https://techchat-apps-in-toss.toss.im/t/topic/2956) — MEDIUM confidence (community, official channel)
- [Sportradar MLB API — Tracking Live Games](https://developer.sportradar.com/baseball/docs/mlb-ig-tracking-live-games) — MEDIUM confidence (analogous domain, game status patterns)
- [Node TLS Rotation: 7 Cert Mistakes Behind Outages](https://medium.com/@1nick1patel1/node-tls-rotation-7-cert-mistakes-behind-outages-e973d7b21f2e) — MEDIUM confidence (corroborated by multiple sources)
- MVP 설계서 (`kbo_game_mvp_설계서.txt`) — 프로젝트 자체 문서
- kbo-game 패키지 특성 — LOW confidence (npm 403 접근 불가, 크롤러 일반 패턴으로 추론)
