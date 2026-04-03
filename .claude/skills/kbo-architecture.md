---
name: kbo-architecture
description: KBO 야구 알리미 모듈 구조, 의존성 방향, 데이터 플로우. Use when working with module boundaries, data flow, or dependency direction.
---

# KBO Architecture Skill

## 모듈 의존성 방향

```
Auth Module (독립)
  └── Supabase users 테이블

Crawler Module (독립)
  └── kbo-game 패키지 → CrawlerService 인터페이스

Polling Worker (Crawler 의존)
  └── CrawlerService → 상태 비교 → DB 영속화

Push Provider (독립)
  └── mTLS → 토스 Push API → push_logs

Game Summary UI (Auth 의존)
  └── Supabase 조회 → GSAP/Lenis 렌더링
```

## 핵심 규칙

1. **모듈 간 직접 import 금지** — 반드시 인터페이스(타입)를 통해 통신
2. **Crawler는 kbo-game을 직접 노출하지 않음** — CrawlerService로 래핑
3. **Worker는 Push를 직접 호출하지 않음** — 큐(push_queue)에 삽입만 수행
4. **UI는 백엔드 모듈을 import하지 않음** — API Route를 통해서만 통신

## 데이터 플로우

```
kbo-game → CrawlerService.getTodayGames()
  → PollingWorker: 상태 비교 (DB vs 크롤링 결과)
    → 상태 전이 감지 (Playing → Finished)
      → push_queue 삽입
        → PushDispatcher: 순차 발송 (100ms 간격)
          → 토스 Push API (mTLS)
            → push_logs 기록
```

## 상태 영속화

- 경기 상태는 **반드시 DB에 저장** (메모리 상태 금지 — 서버리스 콜드스타트 위험)
- games 테이블: game_id, status, inning, home_score, away_score, updated_at
- 상태 전이 판단: DB의 이전 status와 크롤링 결과 비교

## 자주 사용하는 명령어

```bash
pnpm test -- --filter crawler   # 크롤러 테스트
pnpm test -- --filter worker    # 워커 테스트
pnpm test -- --filter push      # 푸시 테스트
```
