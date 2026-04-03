# KBO 야구 알리미 - MVP

## 프로젝트 개요
KBO 경기 종료 알림 서비스. 토스 미니앱 생태계 기반으로, 응원팀 경기가 끝나면 즉시 푸시 알림을 보내고 인터랙티브 경기 요약 화면을 제공한다.

## 기술 스택
- **Frontend:** React / Next.js, Tailwind CSS, GSAP, Lenis
- **Backend:** Node.js (Next.js API Routes)
- **Database:** Supabase (PostgreSQL)
- **외부 API:** 토스 Push API (mTLS), kbo-game 패키지
- **인프라:** Vercel (배포)

## 핵심 모듈 구조
| 모듈 | 경로 | 역할 |
|---|---|---|
| Auth & User | `backend/modules/auth` | 토스 로그인, userKey 관리, 응원팀 설정 |
| KBO Crawler | `backend/modules/crawler` | kbo-game 패키지 래핑, 경기 데이터 추출 |
| Smart Polling Worker | `backend/workers/polling` | 경기 상태 변화 감지, 가변 폴링 |
| Toss Push Provider | `backend/modules/push` | mTLS 인증, 템플릿 메시지 발송, Rate Limit |
| Game Summary UI | `frontend/components/summary` | 경기 결과 요약 화면 (GSAP/Lenis) |

## 모듈 분리 원칙
- Crawler / Worker / Push Provider는 **완전 독립** 모듈로 구현
- 데이터 소스나 알림 채널 변경 시 비즈니스 로직(Worker)은 수정 불필요
- 모듈 간 통신은 인터페이스(타입)를 통해서만 수행

## TDD 필수 구간
다음 모듈은 반드시 테스트를 먼저 작성하고 구현한다:
1. **Auth** - userKey 검증, 응원팀 저장/조회
2. **Crawler** - kbo-game 데이터 파싱, 상태 전이 감지
3. **Polling Worker** - 가변 폴링 주기, 경기 종료 트리거
4. **Toss Push Provider** - mTLS 통신, Rate Limit, 발송 큐

## 절대 하지 말 것
- 실시간 중계 기능
- 댓글/커뮤니티 기능
- MVP 범위 외 기능 추가
- Over Engineering (불필요한 추상화, 미래 대비 설계)

## 개발 명령어
```bash
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm typecheck    # TypeScript 타입 검사
pnpm lint         # ESLint 검사
pnpm test --run   # 전체 테스트 (vitest)
pnpm test --watch # 테스트 워치 모드
```

## 타입 컨벤션
- `type` 선호, `interface` 자제
- **`enum` 절대 금지** → 문자열 리터럴 유니온 사용
- `any` 타입 사용 금지 → `unknown` + 타입 가드
- Zod 스키마로 외부 입력 검증 및 타입 추론
- 모듈 간 통신 타입은 `types/` 디렉토리에 정의

## 컨벤션
- 커밋 메시지: 한국어, 동사형 시작 (예: "추가: 크롤러 모듈 테스트")
- 브랜치: feature/, fix/, test/ 접두사
- 테스트 파일: `__tests__/` 디렉토리 또는 `.test.ts` 접미사
- console.log 금지 → 적절한 로거 사용
