---
name: kbo-testing
description: KBO 야구 알리미 TDD 전략, 테스트 패턴, 모듈별 테스트 가이드. Use when writing tests, TDD cycle, or test strategy.
---

# KBO Testing Skill

## TDD 필수 모듈

| 모듈 | 테스트 대상 | Mock 대상 |
|------|------------|-----------|
| Auth | userKey 검증, 팀 저장/조회, 세션 유지 | Supabase client |
| Crawler | 데이터 파싱, 빈 배열 처리, 에러 구분 | kbo-game 패키지 |
| Polling Worker | 가변 폴링, 상태 전이, DB 영속화 | CrawlerService, DB |
| Push Provider | mTLS 로드, Rate Limit, 큐 순서 | 토스 Push API |

## TDD 사이클

```
1. Red   — 실패하는 테스트 작성
2. Green — 테스트 통과하는 최소 구현
3. Refactor — 코드 정리 (테스트 유지)
```

## 테스트 파일 규칙

```
backend/modules/auth/__tests__/auth.test.ts
backend/modules/crawler/__tests__/crawler.test.ts
backend/workers/polling/__tests__/polling.test.ts
backend/modules/push/__tests__/push.test.ts
```

## 핵심 테스트 케이스

### Crawler
- kbo-game 정상 반환 → 파싱 성공
- kbo-game 빈 배열 → "경기 없음" 처리
- kbo-game 에러/null → "크롤링 실패" 처리 (빈 배열과 구분)
- 상태 전이 감지: Playing → Finished

### Polling Worker
- 기본 폴링 주기 (60초)
- 8회 이후 폴링 주기 단축 (30초)
- 경기 종료 감지 시 push_queue 삽입
- 서버 재시작 후 DB에서 상태 복원

### Push Provider
- mTLS 인증서 로드 성공/실패
- 발송 간격 100ms 이상 준수
- 동시 경기 종료: Promise.allSettled로 독립 처리
- 발송 실패 시 push_logs에 에러 기록

## 자주 사용하는 명령어

```bash
pnpm test --run              # 전체 테스트
pnpm test --watch            # 워치 모드
pnpm test -- --coverage      # 커버리지
```
