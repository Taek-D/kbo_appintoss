# KBO 야구 알리미

## What This Is

KBO 경기 종료 알림 서비스. 토스 미니앱으로 동작하며, 유저가 응원팀을 선택하면 해당 팀 경기 종료 시 즉시 푸시 알림을 보내고, 알림 클릭 시 인터랙티브한 경기 요약 화면을 제공한다.

## Core Value

응원팀 경기가 끝나는 즉시 유저에게 결과를 알려주는 것 — 빠르고 정확한 경기 종료 알림이 모든 것의 핵심.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 토스 로그인으로 인증 후 응원팀 선택 및 구독
- [ ] kbo-game 패키지를 통한 실시간 경기 데이터 수집
- [ ] 경기 상태 변화 감지 (Playing → Finished) 및 가변 폴링
- [ ] 토스 Push API를 통한 경기 종료 알림 발송
- [ ] 알림 클릭 시 인터랙티브 경기 결과 요약 화면 표시

### Out of Scope

- 실시간 중계 기능 — MVP 범위 초과, 복잡도 과다
- 댓글/커뮤니티 기능 — MVP에서 불필요, YAGNI 원칙
- 카카오톡 알림톡 — 토스 생태계에 집중, 향후 확장 가능
- 다중 팀 구독 — v1은 단일 팀 구독으로 단순화

## Context

- **생태계:** 토스 미니앱 플랫폼 기반. 토스 SDK 로그인, 토스 Push API 사용
- **데이터 소스:** `kbo-game` npm 패키지로 KBO 경기 데이터 크롤링
- **시즌 타이밍:** KBO 시즌 초반, 팬들의 관심이 높은 시기 타겟
- **핵심 UX:** 토스 특유의 깨끗한 화이트톤, 둥근 모서리, 부드러운 모션
- **잠재 위험:** 토스 템플릿 검수 지연 시 서비스 오픈 불가 — 개발과 동시에 검수 요청 선행 필요

## Constraints

- **Tech Stack**: React/Next.js + Supabase + Vercel — 토스 미니앱 호환성 및 빠른 배포
- **Push API**: 토스 Push API mTLS 인증 필수 — 인증서 관리 필요
- **Rate Limit**: 토스 Push 발송 간격 100ms 이상 — 순차 발송 큐 필요
- **메시지 스타일**: 토스 가이드라인 준수 (문장형, 특수문자 자제)
- **TDD**: Auth, Crawler, Polling Worker, Push Provider는 TDD 필수

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase 사용 | 빠른 개발, PostgreSQL 기반, Auth 내장 | — Pending |
| kbo-game 패키지 래핑 | 직접 크롤링 대신 검증된 패키지 활용 | — Pending |
| 가변 폴링 (8회 이후 30초) | 리소스 절약 + 종료 시점 빠른 감지 균형 | — Pending |
| Promise.allSettled 사용 | 동시 종료 경기 간 블로킹 방지 | — Pending |
| GSAP + Lenis | 토스 스타일 인터랙티브 UX 구현 | — Pending |

---
*Last updated: 2026-04-03 after initialization*
