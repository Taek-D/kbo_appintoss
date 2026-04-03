# Phase 1: Foundation - Research

**Researched:** 2026-04-04
**Domain:** Toss Mini App SDK (login/auth) + Supabase schema + Next.js App Router project scaffold + KBO team codes
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**온보딩 플로우**
- 2단계 구성: 토스 로그인 → 응원팀 선택 → 메인 화면
- 로그인 화면은 토스 로그인 버튼 + 간단한 한 줄 설명만 (비주얼/일러스트 없음)
- 응원팀 선택 = 알림 구독 암묵적 동의 (별도 동의 단계 없음)
- 재진입 시(이미 온보딩 완료 유저) 메인 화면에 응원팀의 오늘 경기 정보 표시
- 경기 없는 날은 "오늘 경기 없음" 안내

**DB 스키마**
- **users**: id(UUID PK), toss_user_key(TEXT UNIQUE), team_code(TEXT), subscribed(BOOLEAN), created_at, updated_at
- **games**: id(UUID PK), game_date(DATE), home_team(TEXT), away_team(TEXT), status(TEXT: scheduled/playing/finished), home_score(INT), away_score(INT), inning_data(JSONB nullable), started_at, finished_at, created_at, updated_at
- **push_logs**: user_id, game_id, status(success/failed), error_message(nullable), sent_at

**응원팀 선택 UI**
- 5×2 그리드 레이아웃 (10개 구단 한 화면에 전체 표시, 스크롤 불필요)
- 각 카드에 팀 로고 이미지 + 팀명 표시
- 팀 탭 후 확인 단계 추가: "OO팀을 응원할까요?" 확인 버튼 → 저장 후 메인 화면 이동

**구독 관리 UX**
- 메인 화면 내에 현재 응원팀 표시 + 탭하면 변경/해제 옵션
- 구독 해제 시 확인 모달 표시: "알림을 그만 받을까요?"
- 응원팀 변경 시 온보딩의 팀 선택 화면을 그대로 재사용 (현재 팀 하이라이트 상태)

### Claude's Discretion
- team_code 포맷 (kbo-game 패키지가 사용하는 코드 기준으로 맞춤)
- 로딩 상태/스켈레톤 디자인
- 에러 상태 처리 (네트워크 오류 등)
- 토스 디자인 스타일 세부 적용 (화이트톤, 둥근 모서리, 간격)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Supabase에 users, games, push_logs 테이블이 구성된다 | Supabase CLI migration workflow, SQL DDL patterns, @supabase/ssr for Next.js |
| INFRA-02 | 토스 Push 메시지 템플릿이 검수를 통과한다 | 토스 앱인토스 콘솔 템플릿 등록 프로세스, 문구 가이드라인 |
| INFRA-03 | 경기 상태는 DB에 영속화되어 서버 재시작에도 유지된다 | games 테이블 status 컬럼, 메모리 상태 금지 원칙 |
| AUTH-01 | 유저는 토스 로그인으로 별도 회원가입 없이 서비스에 진입할 수 있다 | appLogin() → authCode → accessToken → userKey 플로우 |
| AUTH-02 | 유저는 10개 KBO 구단 중 하나를 응원팀으로 선택할 수 있다 | kbo-game@0.0.2 팀 코드 목록, team_code 컬럼 |
| AUTH-03 | 유저는 재진입 시 기존 응원팀 설정이 유지된다 | toss_user_key UNIQUE 조회, httpOnly cookie 세션 관리 |
| AUTH-04 | 유저는 응원팀을 변경할 수 있다 | users 테이블 UPDATE, 팀 선택 화면 재사용 패턴 |
| SUB-01 | 유저는 알림 구독을 해제할 수 있다 | subscribed BOOLEAN UPDATE, 확인 모달 UX |
| SUB-02 | 유저의 응원팀에 오늘 경기가 없으면 "오늘 경기 없음" 화면이 표시된다 | games 테이블 조회, 빈 결과 처리 패턴 |
</phase_requirements>

---

## Summary

Phase 1은 프로젝트의 데이터 계약과 사용자 진입 경로를 확립한다. 크게 세 영역으로 나뉜다: (1) Supabase CLI로 DB 스키마 마이그레이션 생성, (2) 토스 앱인토스 SDK `appLogin()` → accessToken → userKey 플로우 구현, (3) Next.js App Router 기반 프로젝트 스캐폴딩.

토스 로그인은 OAuth2 인가 코드 흐름이다. 프론트엔드에서 `appLogin()`을 호출해 `authorizationCode`를 받고, 서버 측 API Route에서 토스 토큰 교환 엔드포인트를 호출해 `accessToken`을 얻은 후, 다시 `login-me` 엔드포인트로 `userKey`를 조회한다. 이 `userKey`가 서비스 내 사용자 식별자가 된다. 모든 S2S 호출에는 mTLS 인증서가 필요하다.

kbo-game 패키지는 공개 npm/GitHub에서 찾을 수 없으나, STATE.md에 2026-04-04 기준으로 확인 완료(v0.0.2, `getGame(Date)` → `Game[]`, 경기 상태/스코어/이닝 제공)로 기록되어 있다. 따라서 팀 코드 포맷은 이 패키지 기준을 따른다.

**Primary recommendation:** Next.js App Router + @supabase/ssr + @apps-in-toss/web-framework SDK 조합으로 시작. Supabase 마이그레이션을 먼저 확립하고, Auth 모듈을 TDD로 구현한다.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest stable) | Full-stack 프레임워크 | App Router + Route Handlers. Vercel-native. 프로젝트 컨벤션 |
| TypeScript | 5.x | 타입 안전성 | CLAUDE.md 필수 요건. TDD에 strict 타입 필수 |
| @apps-in-toss/web-framework | 2.0.5 (SDK 2.0.1) | 토스 미니앱 SDK | appLogin(), 토스 API 연동. SDK 1.x 2025-03-23 지원 종료 |
| @supabase/supabase-js | 2.101.x | Supabase DB 클라이언트 | 프로젝트 컨벤션. PostgreSQL + RLS 내장 |
| @supabase/ssr | latest | Next.js App Router SSR용 Supabase | @supabase/auth-helpers-nextjs 대체. Server Component 지원 |
| Zod | 3.x | 입력 검증 및 타입 추론 | CLAUDE.md 필수 요건. 외부 입력(토스 API 응답, userKey) 검증 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | v4.x | 유틸리티 CSS | 토스 스타일(화이트톤, 둥근 모서리) 구현 |
| Vitest | 2.x | 테스트 프레임워크 | TDD 필수 구간 (Auth 모듈). ESM 지원, Jest보다 빠름 |
| @testing-library/react | latest | React 컴포넌트 테스트 | 팀 선택 UI, 구독 관리 컴포넌트 테스트 |
| msw | 2.x | API 모킹 | 토스 API, Supabase 모킹 (테스트 환경) |
| pino 또는 winston | latest | 로거 | console.log 금지 (CLAUDE.md). API Route 서버 로그 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers는 deprecated. ssr 패키지가 공식 권장 |
| Vitest | Jest | Jest는 TypeScript 5 ESM 설정 복잡. Vitest가 현재 표준 |
| pino | console.log | CLAUDE.md 명시 금지. 구조화 로깅 필요 |

**Installation:**

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest kbo-game --typescript --tailwind --app

# Supabase
pnpm add @supabase/supabase-js @supabase/ssr

# Validation
pnpm add zod

# Test
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event msw vite-tsconfig-paths

# Supabase CLI (전역)
npm install -g supabase
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # 토스 로그인 화면
│   ├── (main)/
│   │   ├── page.tsx                 # 메인 화면 (응원팀 + 오늘 경기)
│   │   └── team-select/page.tsx    # 응원팀 선택 화면
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts       # authCode → accessToken → userKey
│       │   └── me/route.ts          # 현재 유저 정보 조회
│       └── subscription/
│           └── route.ts             # 구독 저장/변경/해제
├── backend/
│   └── modules/
│       └── auth/
│           ├── index.ts             # Auth 모듈 public API
│           ├── toss-client.ts       # 토스 API 호출 (mTLS 포함)
│           ├── user-repository.ts   # Supabase users 테이블 CRUD
│           └── __tests__/
│               └── auth.test.ts     # TDD 필수
├── types/
│   ├── user.ts                      # User, TeamCode 타입
│   ├── game.ts                      # Game, GameStatus 타입
│   └── toss.ts                      # TossAuthCode, TossUserKey 타입
└── lib/
    ├── supabase/
    │   ├── client.ts                # 브라우저용 Supabase 클라이언트
    │   └── server.ts                # 서버용 Supabase 클라이언트 (SSR)
    └── logger.ts                    # 중앙 로거 (console.log 대체)

supabase/
├── migrations/
│   └── 20260404000000_init_schema.sql
└── seed.sql
```

### Pattern 1: 토스 로그인 OAuth2 흐름

**What:** `appLogin()` (프론트) → authCode → 서버에서 토큰 교환 → userKey 저장
**When to use:** 모든 로그인 진입점
**Example:**

```typescript
// 프론트엔드: app/(auth)/login/page.tsx
// Source: developers-apps-in-toss.toss.im/login/develop.html
import { appLogin } from '@apps-in-toss/web-framework'

async function handleLogin() {
  const { authorizationCode, referrer } = await appLogin()
  // authCode를 서버 API Route로 전달
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ authorizationCode, referrer }),
  })
}
```

```typescript
// 서버: app/api/auth/login/route.ts
// Source: developers-apps-in-toss.toss.im/login/develop.html
import { NextRequest, NextResponse } from 'next/server'
import { exchangeAuthCode } from '@/backend/modules/auth'

export async function POST(req: NextRequest) {
  const { authorizationCode, referrer } = await req.json()

  // 1. authCode → accessToken (토스 API S2S, mTLS 필요)
  const { accessToken } = await exchangeAuthCode(authorizationCode, referrer)

  // 2. accessToken → userKey (GET /login-me)
  const { userKey } = await getTossUserKey(accessToken)

  // 3. Supabase users 테이블 upsert
  const user = await upsertUser(userKey)

  // 4. httpOnly cookie로 세션 저장 (iOS ITP 대응)
  const response = NextResponse.json({ success: true })
  response.cookies.set('session_token', accessToken, { httpOnly: true, secure: true })
  return response
}
```

```typescript
// 타입 정의: types/toss.ts
// CLAUDE.md 컨벤션: type 선호, enum 금지
export type TossReferrer = 'sandbox' | 'DEFAULT'
export type TossUserKey = string

export type TossAuthResponse = {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number  // 3600초
}

export type TossUserInfo = {
  userKey: TossUserKey
  // 개인정보는 암호화된 형태로 제공 — 이 서비스에서는 userKey만 사용
}
```

### Pattern 2: Supabase 마이그레이션 기반 스키마 확립

**What:** Supabase CLI로 마이그레이션 파일 생성, SQL DDL 작성, `supabase db push`로 배포
**When to use:** DB 스키마 변경 시 항상

```sql
-- supabase/migrations/20260404000000_init_schema.sql
-- Source: supabase.com/docs/guides/local-development/overview

-- users 테이블 (AUTH-01, AUTH-02, AUTH-03)
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  toss_user_key text unique not null,
  team_code   text,                    -- nullable: 팀 선택 전
  subscribed  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- games 테이블 (INFRA-01, INFRA-03)
create table public.games (
  id           uuid primary key default gen_random_uuid(),
  game_date    date not null,
  home_team    text not null,
  away_team    text not null,
  status       text not null default 'scheduled',  -- 'scheduled'|'playing'|'finished'|'cancelled'
  home_score   int not null default 0,
  away_score   int not null default 0,
  inning_data  jsonb,
  started_at   timestamptz,
  finished_at  timestamptz,
  is_notified  boolean not null default false,      -- 중복 발송 방지 플래그
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- push_logs 테이블 (INFRA-01)
create table public.push_logs (
  id            bigint primary key generated always as identity,
  user_id       uuid not null references public.users(id),
  game_id       uuid not null references public.games(id),
  status        text not null,  -- 'success'|'failed'
  error_message text,
  sent_at       timestamptz not null default now()
);

-- 인덱스
create index idx_games_date_status on public.games(game_date, status);
create index idx_users_toss_user_key on public.users(toss_user_key);
create index idx_push_logs_game_id on public.push_logs(game_id);

-- updated_at 자동 갱신 트리거
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row execute function update_updated_at_column();

create trigger update_games_updated_at
  before update on public.games
  for each row execute function update_updated_at_column();
```

### Pattern 3: Auth 모듈 TDD 사이클

**What:** 테스트 먼저 작성 → 최소 구현 → 리팩토링
**When to use:** Auth, Crawler, Polling Worker, Push Provider (CLAUDE.md 필수 구간)

```typescript
// backend/modules/auth/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertUser, getUserByTossKey, updateTeamCode } from '../user-repository'

// Supabase 클라이언트 모킹
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn()
}))

describe('Auth Module - userKey 검증 및 저장', () => {
  it('신규 userKey로 유저를 생성한다', async () => {
    // ... Red → Green → Refactor
  })

  it('기존 userKey로 재진입 시 기존 유저를 반환한다', async () => {
    // AUTH-03: 재진입 시 설정 유지
  })

  it('team_code를 업데이트한다', async () => {
    // AUTH-04: 응원팀 변경
  })

  it('구독을 해제한다 (subscribed = false)', async () => {
    // SUB-01
  })
})
```

### Pattern 4: KBO 팀 코드 상수 정의

**What:** kbo-game 패키지 기준 팀 코드를 상수로 정의. enum 금지 → 문자열 리터럴 유니온
**When to use:** 팀 선택 UI, DB team_code 컬럼, 구독 조회

```typescript
// types/user.ts
// CLAUDE.md: enum 절대 금지 → 문자열 리터럴 유니온 사용
// kbo-game@0.0.2 기준 팀 코드 (STATE.md 확인 완료)
export type TeamCode =
  | 'HH'  // 한화 이글스
  | 'OB'  // 두산 베어스
  | 'LG'  // LG 트윈스
  | 'KT'  // KT 위즈
  | 'SS'  // 삼성 라이온즈
  | 'NC'  // NC 다이노스
  | 'SK'  // SSG 랜더스
  | 'LT'  // 롯데 자이언츠
  | 'WO'  // 키움 히어로즈
  | 'KI'  // KIA 타이거즈

export const KBO_TEAMS: Array<{ code: TeamCode; name: string }> = [
  { code: 'HH', name: '한화 이글스' },
  { code: 'OB', name: '두산 베어스' },
  { code: 'LG', name: 'LG 트윈스' },
  { code: 'KT', name: 'KT 위즈' },
  { code: 'SS', name: '삼성 라이온즈' },
  { code: 'NC', name: 'NC 다이노스' },
  { code: 'SK', name: 'SSG 랜더스' },
  { code: 'LT', name: '롯데 자이언츠' },
  { code: 'WO', name: '키움 히어로즈' },
  { code: 'KI', name: 'KIA 타이거즈' },
]
```

> **주의:** kbo-game@0.0.2의 실제 팀 코드 포맷은 개발 시작 시 패키지 import 후 즉시 확인 필요. 위 코드는 일반적인 KBO 데이터 소스 코드 패턴 기반. CLAUDE.md "Claude's Discretion"에 해당.

### Anti-Patterns to Avoid

- **토스 로그인 완료 후 메모리에만 userKey 저장:** Vercel 서버리스 콜드스타트 시 소멸. 반드시 Supabase DB upsert + httpOnly cookie 저장.
- **authorizationCode를 URL 파라미터로 전달:** 10분 유효기간 + 보안 문제. 항상 POST body로.
- **localStorage로 세션 관리:** iOS ITP가 7일 후 삭제. httpOnly cookie 또는 네이티브 스토리지 사용.
- **enum으로 TeamCode 정의:** CLAUDE.md 절대 금지. 문자열 리터럴 유니온만 사용.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase 클라이언트 설정 | 직접 fetch로 Postgres 호출 | @supabase/supabase-js + @supabase/ssr | SSR/RSC 환경별 클라이언트 분리, 쿠키 처리 자동화 |
| Zod 없이 토스 API 응답 파싱 | 타입 단언(`as TossResponse`) | Zod 스키마 검증 | 토스 API 응답 구조 변경 시 런타임 에러 방지 |
| 커스텀 마이그레이션 관리 | SQL 파일 수동 실행 스크립트 | Supabase CLI `supabase migration new` + `supabase db push` | 순서 보장, 히스토리 추적, 팀 협업 |
| 커스텀 테스트 러너 | 직접 테스트 인프라 구축 | Vitest + @testing-library/react | pnpm test 컨벤션 그대로 사용 |

**Key insight:** 토스 mTLS S2S 통신은 직접 구현하지만, 인증서 로드/관리는 Node.js 내장 `https.Agent`로 충분. 별도 라이브러리 불필요.

---

## Common Pitfalls

### Pitfall 1: 토스 Push 메시지 템플릿 검수 미선행

**What goes wrong:** 개발 완료 후 검수 신청하면 영업일 2-3일 지연. KBO 시즌 초반 타이밍 윈도우 상실.
**Why it happens:** "개발 끝나고 신청하면 되겠지"는 순차적 사고. 개발과 검수는 병렬 진행해야 함.
**How to avoid:** Phase 1 Day 1에 메시지 문구 확정 후 즉시 앱인토스 콘솔에서 검수 신청. 문구는 범용적으로 작성 (변수화).
**Warning signs:** 계획에 "템플릿 검수 신청" 태스크가 없음.

### Pitfall 2: appLogin() Promise가 resolve되지 않는 경우

**What goes wrong:** 토스 앱 외부 환경(브라우저 직접 접근)에서 `appLogin()`이 무기한 pending 상태.
**Why it happens:** SDK가 토스 앱 WebView 환경에서만 동작. 일반 브라우저에서는 네이티브 브릿지 없음.
**How to avoid:** 개발 환경에서는 `referrer === 'sandbox'`로 분기. 샌드박스 앱으로 테스트. 프로덕션 빌드 전 토스 앱 환경 필수 확인.
**Warning signs:** 로컬 브라우저에서 로그인 버튼 클릭 후 아무 반응 없음.

### Pitfall 3: userKey를 users 테이블 PK로 사용

**What goes wrong:** userKey가 변경될 수 있는 외부 식별자. 내부 PK로 사용하면 변경 시 연관 데이터 전체 갱신 필요.
**Why it happens:** "userKey = 사용자 ID"로 착각.
**How to avoid:** 내부 UUID PK 분리. `toss_user_key`는 UNIQUE 인덱스로 조회용만 사용. 연관 테이블(push_logs)은 내부 `user_id` 참조.
**Warning signs:** push_logs.user_id가 toss_user_key 문자열로 저장됨.

### Pitfall 4: 세션 관리에 localStorage 사용

**What goes wrong:** iOS에서 Toss 앱 WebView가 7일 이상 미사용 시 ITP(Intelligent Tracking Prevention)가 localStorage 초기화. 로그인 상태 소멸.
**Why it happens:** 일반 웹 개발 관행이 WebView 환경에서는 맞지 않음.
**How to avoid:** httpOnly cookie (서버 발급) 또는 @apps-in-toss/web-framework의 네이티브 스토리지 API 사용.
**Warning signs:** 며칠 후 재접속 시 로그인 상태가 풀리는 사용자 리포트.

### Pitfall 5: @supabase/auth-helpers-nextjs 사용

**What goes wrong:** 이 패키지는 deprecated. Next.js App Router에서 Server Components/Route Handlers와 쿠키 처리가 올바르게 동작하지 않음.
**Why it happens:** 구버전 튜토리얼/블로그 참고.
**How to avoid:** 반드시 `@supabase/ssr` 패키지 사용. `createServerClient` (서버), `createBrowserClient` (클라이언트) 분리.
**Warning signs:** `cookies` 관련 타입 에러, 서버 컴포넌트에서 세션 미인식.

---

## Code Examples

### Supabase 서버 클라이언트 설정 (Next.js App Router)

```typescript
// lib/supabase/server.ts
// Source: supabase.com/docs/guides/auth/quickstarts/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### 토스 mTLS 클라이언트 설정

```typescript
// backend/modules/auth/toss-client.ts
// Source: developers-apps-in-toss.toss.im/development/integration-process.html
import https from 'https'
import axios from 'axios'

const TOSS_BASE_URL = 'https://apps-in-toss-api.toss.im'

// 인증서를 환경변수에서 로드 (base64 인코딩 권장)
const tossHttpsAgent = new https.Agent({
  cert: process.env.TOSS_MTLS_CERT,
  key: process.env.TOSS_MTLS_KEY,
})

export const tossClient = axios.create({
  baseURL: TOSS_BASE_URL,
  httpsAgent: tossHttpsAgent,
})

// authCode → accessToken 교환
export async function exchangeAuthCode(authorizationCode: string, referrer: string) {
  const res = await tossClient.post(
    '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
    { authorizationCode, referrer }
  )
  return res.data as { accessToken: string; refreshToken: string; expiresIn: number }
}

// accessToken → userKey 조회
export async function getTossUserKey(accessToken: string) {
  const res = await tossClient.get(
    '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.data as { userKey: string }
}
```

### User Repository (Supabase CRUD)

```typescript
// backend/modules/auth/user-repository.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { TeamCode } from '@/types/user'

export type User = {
  id: string
  toss_user_key: string
  team_code: TeamCode | null
  subscribed: boolean
  created_at: string
  updated_at: string
}

export async function upsertUser(tossUserKey: string): Promise<User> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .upsert({ toss_user_key: tossUserKey }, { onConflict: 'toss_user_key' })
    .select()
    .single()

  if (error) throw new Error(`upsertUser failed: ${error.message}`)
  return data
}

export async function updateTeamCode(userId: string, teamCode: TeamCode): Promise<User> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .update({ team_code: teamCode, subscribed: true })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(`updateTeamCode failed: ${error.message}`)
  return data
}

export async function updateSubscription(userId: string, subscribed: boolean): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({ subscribed })
    .eq('id', userId)

  if (error) throw new Error(`updateSubscription failed: ${error.message}`)
}
```

### Vitest 설정

```typescript
// vitest.config.mts
// Source: nextjs.org/docs/pages/guides/testing/vitest
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### 토스 메시지 템플릿 문구 예시 (검수 통과 기준)

```
제목: [팀명] 경기가 끝났습니다
내용: [홈팀] [홈스코어] : [어웨이스코어] [어웨이팀]
      결과를 확인해보세요
```

**기능성 메시지 원칙 (검수 통과 조건):**
- 순수 정보 전달만 포함 (팀명, 스코어, 경기 결과)
- 특수문자, 이모지 최소화
- "지금 바로!", "놓치지 마세요!" 등 행동 유도 문구 금지
- 이벤트/마케팅 내용 혼입 금지

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | App Router SSR 지원 개선 |
| Next.js Pages Router API Routes | App Router Route Handlers | 2023 (Next.js 13+) | Web 표준 Request/Response API |
| @apps-in-toss/web-framework v1.x | v2.0.x (SDK 2.0.1) | 2025-03-05 | React 19 지원, build 커맨드 변경 (`ait build`) |
| `granite build` (토스 SDK) | `ait build` | 2025-03-23 | SDK 1.x 완전 지원 종료 |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: deprecated, @supabase/ssr로 전환
- @apps-in-toss/web-framework v1.x: 2025-03-23 지원 종료, v2 필수
- `granite build` CLI: `ait build`로 대체

---

## Open Questions

1. **kbo-game@0.0.2 정확한 팀 코드 포맷**
   - What we know: STATE.md에 v0.0.2 확인, `getGame(Date)` → `Game[]` 반환 확인
   - What's unclear: 팀 코드 정확한 문자열 값 (예: 'HH' vs 'hanhwa' vs '한화')
   - Recommendation: `import { getGame } from 'kbo-game'` 후 즉시 실제 반환값 콘솔 출력으로 확인. CLAUDE.md "Claude's Discretion"이므로 패키지 실제 값에 맞춰 `TeamCode` 타입 확정.

2. **토스 앱인토스 SDK @apps-in-toss/web-framework 패키지 설치 방법**
   - What we know: SDK 버전 2.0.5 확인, npm 공개 패키지 여부 불명확
   - What's unclear: `npm install @apps-in-toss/web-framework` 가능 여부, 혹은 앱인토스 콘솔 내 별도 다운로드 필요 여부
   - Recommendation: 앱인토스 개발자센터(developers-apps-in-toss.toss.im) SDK 설치 가이드 직접 확인. 콘솔 가입/앱 등록 선행 필요.

3. **로컬 개발 환경에서 appLogin() 테스트 방법**
   - What we know: SDK가 토스 앱 WebView 환경에서만 동작. `referrer === 'sandbox'`로 샌드박스 지원
   - What's unclear: 샌드박스 앱 APK/IPA 제공 여부, 로컬 개발 서버 연결 방법
   - Recommendation: 앱인토스 콘솔에서 샌드박스 앱 다운로드 및 로컬 개발 서버(ngrok 또는 Vercel Preview) URL 등록.

4. **Supabase RLS (Row Level Security) 필요 여부**
   - What we know: 프론트엔드에서 직접 Supabase를 호출하는 구조가 아님 (모든 DB 호출은 API Route 경유)
   - What's unclear: 서버 측에서만 호출하므로 RLS 불필요한지, 또는 service_role key 사용으로 대체할지
   - Recommendation: MVP에서는 서버 측 `SUPABASE_SERVICE_ROLE_KEY`로 RLS 우회. 필요 시 Phase 2에서 추가.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.mts` — Wave 0에서 생성 |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | authCode → accessToken → userKey 교환 성공 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| AUTH-01 | 잘못된 authCode 시 에러 반환 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| AUTH-02 | team_code 저장 성공 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| AUTH-02 | 유효하지 않은 team_code 거부 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| AUTH-03 | 기존 userKey 재진입 시 동일 유저 반환 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| AUTH-04 | team_code 업데이트 성공 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| SUB-01 | subscribed=false 업데이트 성공 | unit | `pnpm test --run backend/modules/auth` | ❌ Wave 0 |
| SUB-02 | games 테이블 쿼리 빈 결과 처리 | unit | `pnpm test --run` | ❌ Wave 0 |
| INFRA-01 | 마이그레이션 SQL 문법 유효성 | smoke | `supabase db reset` (로컬) | ❌ Wave 0 |
| INFRA-02 | 템플릿 검수 신청 완료 | manual | N/A — 앱인토스 콘솔 수동 확인 | N/A |
| INFRA-03 | games.status DB 영속화 확인 | integration | `pnpm test --run` (Supabase mock) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test --run backend/modules/auth`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.mts` — Vitest 설정 파일
- [ ] `vitest.setup.ts` — jest-dom 등 전역 설정
- [ ] `backend/modules/auth/__tests__/auth.test.ts` — Auth TDD 테스트 파일 (REQ AUTH-01~04, SUB-01)
- [ ] `supabase/migrations/20260404000000_init_schema.sql` — 초기 스키마 마이그레이션 (INFRA-01)
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event msw vite-tsconfig-paths`

---

## Sources

### Primary (HIGH confidence)
- [앱인토스 로그인 개발 가이드](https://developers-apps-in-toss.toss.im/login/develop.html) — appLogin() 플로우, 토큰 교환 엔드포인트, userKey 조회
- [앱인토스 mTLS 연동 가이드](https://developers-apps-in-toss.toss.im/development/integration-process.html) — mTLS 인증서 발급, 390일 유효기간, 다중 인증서
- [Supabase Local Development & Migrations](https://supabase.com/docs/guides/local-development/overview) — migration 워크플로우
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — @supabase/ssr 설정
- [Next.js Vitest Guide](https://nextjs.org/docs/pages/guides/testing/vitest) — vitest.config.mts 설정

### Secondary (MEDIUM confidence)
- [앱인토스 릴리즈 노트](https://developers-apps-in-toss.toss.im/release-note.html) — SDK 2.0.1, `ait build`, v1.x 종료 날짜
- [앱인토스 커뮤니티 appLogin 문의](https://techchat-apps-in-toss.toss.im/t/applogin/3056) — httpOnly cookie 패턴, iOS ITP 이슈
- [앱인토스 examples GitHub](https://github.com/toss/apps-in-toss-examples) — with-app-login 예제 존재 확인

### Tertiary (LOW confidence)
- kbo-game@0.0.2 팀 코드 포맷 — STATE.md 기록 기반, 실제 패키지 확인 전까지 LOW
- KBO_TEAMS 상수의 팀 코드 문자열 값 — 일반적인 KBO 데이터 소스 패턴 기반 추론

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 공식 문서 확인 완료 (Next.js, Supabase, Vitest, 토스 SDK)
- Architecture: HIGH — 토스 로그인 OAuth2 플로우 공식 문서 확인, Supabase 마이그레이션 패턴 확인
- Pitfalls: HIGH — 공식 커뮤니티 + 공식 문서 기반. iOS ITP 이슈 실제 사례 확인
- kbo-game 팀 코드: LOW — 패키지 npm 공개 접근 불가, STATE.md 확인 기록만 존재

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30일 — Next.js/Supabase 안정 스택; 토스 SDK는 빠르게 변경될 수 있으므로 릴리즈 노트 주기적 확인 권장)
