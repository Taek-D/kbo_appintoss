# Research Summary: KBO 야구 알리미 (Toss Mini-App)

**Domain:** Sports game-end notification mini-app (Toss ecosystem)
**Researched:** 2026-04-03
**Overall confidence:** MEDIUM-HIGH

---

## Executive Summary

KBO 야구 알리미는 토스 미니앱으로 동작하는 야구 경기 종료 알림 서비스다. 기술적 핵심은 세 가지다: (1) kbo-game npm 패키지를 통한 실시간 경기 상태 폴링, (2) 토스 Push API(mTLS)를 통한 즉시 알림 발송, (3) GSAP + Lenis 기반 인터랙티브 경기 결과 화면. 이 세 요소가 모두 동작해야 서비스의 핵심 가치가 실현된다.

스택은 프로젝트 제약사항(PROJECT.md)과 2026년 현재 생태계 표준이 잘 맞아떨어진다. Next.js 16 + Supabase + Vercel 조합은 빠른 초기 개발에 최적화되어 있고, Tailwind v4 + shadcn/ui는 토스 특유의 화이트톤 UI를 효율적으로 구현할 수 있게 한다. 단, 폴링 워커는 Vercel 서버리스 함수의 실행 시간 제한을 초과하므로 별도 퍼시스턴트 프로세스(Fly.io 또는 Railway)로 운영해야 한다.

가장 큰 리스크는 두 가지다. 첫째, kbo-game npm 패키지가 공개 npm/GitHub 검색에서 확인되지 않았다(LOW confidence). 패키지 존재 여부와 API 형태를 프로젝트 킥오프 직후 즉시 검증해야 하며, 불가 시 naver sports 직접 크롤링으로 전환할 수 있도록 CrawlerService 인터페이스를 먼저 설계해야 한다. 둘째, 토스 Push API 메시지 템플릿 검수는 영업일 기준 2-3일이 소요된다. 개발과 병행하여 Day 1에 신청하지 않으면 KBO 시즌 초반 타이밍 윈도우를 놓친다.

아키텍처 관점에서 이 서비스는 단순한 CRUD 앱이 아니라 비동기 이벤트 파이프라인이다. 폴링 워커 → 상태 전이 감지 → 큐 삽입 → 순차 발송의 파이프라인이 정확히 동작해야 한다. 각 단계의 실패 모드를 TDD로 검증하고 DB 기반 상태 영속화를 통해 서버 재시작에도 내성을 갖춰야 한다.

---

## Key Findings

**Stack:** Next.js 16 + TypeScript + Tailwind v4 + Supabase + BullMQ/Redis + GSAP + Lenis + Vercel

**Architecture:** 비동기 이벤트 파이프라인 — Next.js App(Vercel) + 퍼시스턴트 폴링 워커(Fly.io/Railway) + Supabase DB + Redis 큐 + Toss Push API(mTLS)

**Critical pitfall:** 템플릿 검수 미선행 — 개발 완료 후 검수 신청 시 KBO 시즌 타이밍 윈도우 상실. Day 1에 문구 확정 및 신청 필수.

---

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation: DB Schema + Auth + 검수 신청** — 모든 컴포넌트의 전제 조건
   - Addresses: 토스 로그인, 구독 데이터 모델
   - Avoids: 메시지 템플릿 검수 지연(Day 1 신청), 서버 재시작 상태 소실(DB 기반 상태 설계)
   - 병행 태스크: 토스 콘솔 앱 등록, mTLS 인증서 발급, 템플릿 검수 신청

2. **Crawler Module (TDD)** — kbo-game 패키지 래핑 및 CrawlerService 인터페이스
   - Addresses: KBO 경기 데이터 수집
   - Avoids: 패키지 미존재 리스크(인터페이스 우선 설계), 빈 배열 오처리(TDD 케이스)
   - **최우선 검증**: 킥오프 직후 kbo-game 패키지 설치 가능 여부 확인

3. **Polling Worker** — BullMQ 기반 가변 폴링 + 상태 전이 감지
   - Addresses: Playing → Finished 감지, 8회 이후 30초 폴링
   - Avoids: Vercel 함수 타임아웃(별도 퍼시스턴트 프로세스), 상태 깜빡임(더블체크 로직), 메모리 상태 의존(DB 영속화)

4. **Push Provider (TDD)** — mTLS 설정 + 순차 큐 발송
   - Addresses: 토스 Push API 100ms rate limit, 동시 경기 발송
   - Avoids: 인증서 만료 무음 장애(만료일 알림), 병렬 발송 rate limit 위반(BullMQ concurrency: 1)

5. **Game Result UI** — GSAP + Lenis 인터랙티브 결과 화면
   - Addresses: 알림 탭 후 결과 화면, 토스 스타일 애니메이션
   - Avoids: GSAP ScrollTrigger 초기화 오류(Next.js SSR 컴포넌트에서 `typeof window` 가드 필요)

6. **Mini-App Shell + Integration** — 구독 UI, 온보딩, 전체 통합 테스트
   - Addresses: 토스 로그인 버튼, 팀 선택 UI, 구독 해제
   - Avoids: 깊은 링크(deep-link) 라우팅 누락, 경기 없는 날 빈 화면

**Phase ordering rationale:**
- DB Schema가 모든 컴포넌트의 데이터 계약을 정의하므로 Phase 1이 선행 필수
- Crawler는 Worker의 의존성이므로 Phase 2 → 3 순서 고정
- Push Provider는 Worker가 큐에 삽입한 후 소비하므로 Phase 3 → 4 순서 고정
- UI는 DB와 Auth만 있으면 독립 개발 가능 — Phase 5-6은 Phase 1 완료 후 Phase 2-4와 병행 가능
- 검수 신청은 Phase 1과 동시에 진행(비기술 병행 태스크)

**Research flags for phases:**
- Phase 2 (Crawler): kbo-game 패키지 존재 여부와 API 형태 — 킥오프 즉시 검증 필수
- Phase 3 (Worker): Vercel vs Fly.io 폴링 워커 호스팅 결정 — Phase 1 완료 전 확정
- Phase 4 (Push): Toss Push API 실제 rate limit 수치 및 엔드포인트 — 콘솔 접속 후 공식 확인
- Phase 5 (UI): GSAP + Next.js 16 SSR 호환성 — `use client` 경계 설계 필요

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (Next.js, Supabase, Tailwind, GSAP, Lenis) | HIGH | 버전 모두 공식 소스 확인 (nextjs.org, npmjs.com) |
| Toss Push API (mTLS, 순차 발송) | MEDIUM | 공식 개발자센터 docs는 접근 불가(인증 필요); 구조는 커뮤니티 + 통합 가이드 페이지에서 확인 |
| BullMQ 폴링 워커 패턴 | HIGH | 공식 BullMQ docs + 다수 실사례 문서로 검증 |
| kbo-game npm 패키지 | LOW | 공개 npm/GitHub 검색에서 미확인. 프로젝트에서 명시하나 외부 검증 불가 |
| 토스 검수 소요 기간 (2-3 영업일) | MEDIUM | 공식 커뮤니티 언급 기반; 정확한 수치는 토스 담당자 확인 필요 |
| 아키텍처 패턴 (이벤트 파이프라인) | HIGH | 도메인 표준 패턴; Supabase + BullMQ 사례 다수 검증 |

---

## Gaps to Address

1. **kbo-game 패키지 검증** — npm install 가능 여부, 실제 반환 타입, 마지막 업데이트 일자를 킥오프 즉시 확인. 불가 시 네이버 스포츠 크롤링으로 대체 설계 즉시 착수.

2. **Toss Push API 공식 스펙** — 앱인토스 콘솔 접속 후 rate limit 정확한 수치, 엔드포인트 URL, 페이로드 스키마 확인. mTLS 인증서 발급 절차도 콘솔에서 직접 확인.

3. **폴링 워커 호스팅 결정** — Fly.io vs Railway vs Vercel Background Functions 중 팀 인프라 상황에 맞는 선택 필요. 비용과 배포 복잡도 기준으로 Phase 1 완료 전 결정.

4. **GSAP + Next.js 16 SSR 호환성** — `use client` 디렉티브와 GSAP ScrollTrigger 초기화 타이밍 검증. SSR에서 window 객체 접근 오류 방지 패턴 확립.

5. **KBO 시즌 일정** — 2026 KBO 시즌 개막일 확인하여 릴리즈 타이밍 역산. 검수 신청 데드라인 계산.
