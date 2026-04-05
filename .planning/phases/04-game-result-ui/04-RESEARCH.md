# Phase 4: Game Result UI - Research

**Researched:** 2026-04-05
**Domain:** GSAP animation, Lenis smooth scroll, Next.js App Router dynamic routes, Supabase data fetching
**Confidence:** HIGH (core stack), MEDIUM (Lenis webview behavior)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 토스 카드 스타일 스코어보드 — 큰 스코어 중앙 배치, 팀 로고 좌우 대칭, rounded-2xl 카드 내부. 기존 코드베이스의 화이트톤 + bg-gray-50 패턴과 일관됨
- **D-02:** 이닝별 점수는 별도 카드에 테이블 형식으로 표시 (1~9회 + R 합계)
- **D-03:** 승리 강조 — 응원팀 승리 시 파란색(#0064FF) 액센트 + 세레브레이션 이펙트, 패배 시 차분한 톤
- **D-04:** GSAP은 스코어 카운트업만 적용 — 최종 스코어가 0에서 카운트업. 토스 미니앱 성능 우선, 최소한의 핵심 모션에 집중
- **D-05:** Lenis는 결과 화면(/game/{id})에만 적용 — 다른 페이지는 기본 스크롤 유지
- **D-06:** 경기 상태 카드 — 예정(scheduled)/진행중(playing)/종료(finished) 상태별 다른 카드 UI. 종료된 경기 탭 시 /game/{gameId} 결과 화면으로 이동
- **D-07:** 전체 경기 목록 표시 — 응원팀 경기를 상단에 강조 배치, 아래에 다른 KBO 경기 목록 표시. 경기 없는 날은 기존 "오늘 경기 없음" UI 유지
- **D-08:** 잘못된 gameId / 존재하지 않는 경기 → 메인 화면 자동 리디렉트
- **D-09:** 뒤로가기는 항상 메인 화면으로 이동

### Claude's Discretion

- 스코어 카운트업 애니메이션 duration/easing 세부 설정
- 이닝별 테이블 스타일링 세부사항 (셀 크기, 폰트 사이즈)
- 결과 화면 스켈레톤/로딩 UI 디자인
- 경기 상태 카드 디자인 디테일 (색상, 아이콘, 간격)
- 전체 경기 목록의 정렬 순서 (시간순 등)
- 메인 화면 경기 데이터 API Route 설계

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | 유저는 알림 클릭 시 경기 결과 요약 화면을 볼 수 있다 | `/game/[id]` 동적 라우트 + Supabase 개별 경기 조회 API |
| UI-02 | 결과 화면에 최종 스코어와 이닝별 점수가 표시된다 | `games.home_score`, `games.away_score`, `games.inning_data` JSONB 필드 |
| UI-03 | 결과 화면에 GSAP 기반 스코어 카운트업 애니메이션이 동작한다 | `@gsap/react` useGSAP hook + `gsap.from(el, { textContent: 0, snap: { textContent: 1 } })` 패턴 |
| UI-04 | 페이지 전체에 Lenis 기반 부드러운 스크롤이 적용된다 | `lenis@1.3.21` + `autoRaf: true` 패턴, 결과 화면 컴포넌트 레벨 적용 |
| UI-05 | 토스 디자인 스타일(화이트톤, 둥근 모서리)이 일관되게 적용된다 | 기존 `bg-white`, `rounded-2xl`, `#0064FF` 패턴 그대로 확장 |
</phase_requirements>

---

## Research Summary

Phase 4는 기존에 구축된 폴링/푸시 파이프라인 위에 사용자 접점 UI를 완성하는 마지막 단계다. 핵심 작업은 세 가지다: (1) `/game/[id]` 동적 라우트 생성 + Supabase 경기 데이터 API 연동, (2) GSAP 스코어 카운트업 애니메이션, (3) Lenis 부드러운 스크롤 적용.

GSAP은 `@gsap/react` 패키지의 `useGSAP` 훅을 사용하는 것이 2025년 공식 권장 방식이다. 이 훅은 SSR 안전 처리(useIsomorphicLayoutEffect 내부 구현)와 자동 cleanup을 포함한다. `"use client"` 지시자와 함께 사용하면 된다. 스코어 카운트업은 `gsap.from(element, { textContent: 0, snap: { textContent: 1 } })` 패턴으로 구현한다.

Lenis는 `lenis` 패키지(구 `@studio-freight/lenis` 대체)를 사용한다. D-05 결정에 따라 전역 적용 대신 결과 화면 컴포넌트에서만 초기화한다. 토스 미니앱 웹뷰 환경에서의 스크롤 충돌 위험이 있으므로 `syncTouch: false` 옵션으로 완화한다.

**Primary recommendation:** `gsap@3.14.2` + `@gsap/react` + `lenis@1.3.21`을 신규 의존성으로 추가. 결과 화면은 `src/app/(main)/game/[id]/page.tsx`로 생성하고, 기존 `'use client'` + `useState/useEffect/fetch` 패턴을 그대로 따른다.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gsap | 3.14.2 | 스코어 카운트업 애니메이션 | 공식 GSAP 패키지 (CLAUDE.md 명시) |
| @gsap/react | 3.14.2 | useGSAP 훅 (SSR 안전, 자동 cleanup) | GSAP 공식 React 통합 패키지 |
| lenis | 1.3.21 | 부드러운 스크롤 | `@studio-freight/lenis` 공식 후계 패키지 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr (기존) | ^0.10.0 | 서버 사이드 Supabase 클라이언트 | API Route에서 게임 데이터 조회 |
| next/navigation (기존) | 내장 | `redirect()`, `notFound()` | 잘못된 gameId 처리 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lenis | @studio-freight/lenis | 구 패키지, deprecated. lenis로 대체됨 |
| useGSAP hook | useLayoutEffect + gsap | 수동 cleanup 필요, SSR 처리 직접 구현해야 함 |

**Installation:**
```bash
pnpm add gsap @gsap/react lenis
```

**Version verification (2026-04-05 확인):**
- gsap: 3.14.2
- lenis: 1.3.21
- @gsap/react: gsap과 동일 버전으로 번들 포함됨

---

## Architecture Patterns

### Recommended Project Structure (Phase 4 신규 파일)
```
src/
├── app/
│   ├── (main)/
│   │   └── game/
│   │       └── [id]/
│   │           └── page.tsx        # UI-01: 경기 결과 페이지 (use client)
│   └── api/
│       ├── games/
│       │   ├── today/
│       │   │   └── route.ts        # D-06/D-07: 오늘 경기 목록 API
│       │   └── [id]/
│       │       └── route.ts        # UI-01/UI-02: 개별 경기 상세 API
├── components/
│   ├── GameCard.tsx                # D-06: 경기 상태별 카드 컴포넌트
│   ├── ScoreBoard.tsx              # UI-02: 스코어보드 (GSAP 카운트업 포함)
│   └── InningTable.tsx             # UI-02: 이닝별 점수 테이블
```

### Pattern 1: useGSAP 스코어 카운트업

**What:** GSAP의 `textContent` 트윈으로 숫자 DOM 요소를 0에서 목표값까지 애니메이션
**When to use:** 스코어 숫자 표시 시 (UI-03)

```typescript
// Source: https://gsap.com/resources/React/ + https://www.chris9soul.com/blog/animate-numbers-gsap/
'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

type ScoreDisplayProps = {
  score: number
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const scoreRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    if (!scoreRef.current) return
    gsap.from(scoreRef.current, {
      textContent: 0,
      duration: 1.2,
      ease: 'power2.out',
      snap: { textContent: 1 },
      delay: 0.3,
    })
  }, { scope: scoreRef, dependencies: [score] })

  return <span ref={scoreRef}>{score}</span>
}
```

### Pattern 2: Lenis 결과 화면 로컬 초기화

**What:** 결과 화면 컴포넌트에서만 Lenis 인스턴스 생성/소멸 (D-05)
**When to use:** `/game/[id]` 페이지 전용. 다른 페이지는 기본 스크롤 유지

```typescript
// Source: https://bridger.to/lenis-nextjs (컴포넌트 레벨 패턴으로 조정)
'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

export function useLocalLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      syncTouch: false, // 토스 웹뷰 모바일 터치 충돌 방지
    })

    return () => {
      lenis.destroy()
    }
  }, [])
}
```

### Pattern 3: Next.js App Router 동적 라우트 + notFound/redirect

**What:** `/game/[id]` 에서 유효하지 않은 gameId 처리 (D-08)
**When to use:** API 조회 결과 null / DB에 없는 경기

```typescript
// Source: Next.js 공식 App Router 문서 패턴
import { redirect } from 'next/navigation'

// API Route (src/app/api/games/[id]/route.ts)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ game })
}

// Page (src/app/(main)/game/[id]/page.tsx) — client component
// 404 응답 수신 시 router.replace('/') 호출
```

### Pattern 4: 메인 화면 경기 카드 + 네비게이션

**What:** 기존 메인 화면의 "오늘 경기 없음" placeholder를 실제 경기 목록으로 교체 (D-06, D-07)

```typescript
// 기존 패턴과 동일: useState + useEffect + fetch
const [games, setGames] = useState<Game[]>([])

useEffect(() => {
  fetch('/api/games/today')
    .then(r => r.json())
    .then(data => setGames(data.games ?? []))
    .catch(() => setGames([]))
}, [])

// 종료된 경기 탭 → router.push(`/game/${game.id}`)
```

### Anti-Patterns to Avoid

- **전역 Lenis 설치:** `app/layout.tsx`에 Lenis를 전역 설치하면 토스 미니앱 다른 페이지 스크롤 충돌 가능. D-05 결정대로 결과 화면 컴포넌트에만 적용
- **useLayoutEffect 직접 사용:** GSAP을 `useLayoutEffect`로 직접 감싸면 SSR에서 경고 발생. `useGSAP`이 내부적으로 처리하므로 직접 사용 불필요
- **gsap 플러그인 미등록:** `gsap.registerPlugin(useGSAP)`을 컴포넌트 모듈 최상단에서 한 번 호출 필요. 빠뜨리면 타입 에러 또는 동작 불량
- **inning_data 타입 단언 없이 사용:** DB의 `inning_data`는 `Record<string, unknown> | null` 타입. 렌더링 전 반드시 런타임 타입 가드 적용

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 숫자 카운트업 애니메이션 | requestAnimationFrame 루프 직접 구현 | GSAP `textContent` + `snap` | easing, cleanup, 타이밍 제어 복잡도 |
| 부드러운 스크롤 | CSS `scroll-behavior: smooth` 또는 직접 구현 | lenis | 토스 디자인 수준의 관성 효과는 직접 구현 시 수백 줄 필요 |
| SSR 안전 GSAP | `useLayoutEffect` + typeof window 체크 | `useGSAP` hook | 이미 isomorphic 처리 내장 |

**Key insight:** GSAP과 Lenis는 각각 애니메이션과 스크롤 분야에서 가장 정교한 오픈소스 구현이다. 특히 easing 곡선, 브라우저 호환성, 메모리 cleanup을 직접 구현하면 버그 표면이 지나치게 커진다.

---

## Common Pitfalls

### Pitfall 1: Lenis + 토스 웹뷰 터치 스크롤 충돌
**What goes wrong:** Android 웹뷰에서 Lenis가 기본 터치 스크롤 관성을 재정의하면서 스크롤이 뚝뚝 끊기거나 과도하게 미끄러지는 현상
**Why it happens:** Android에는 내장 스크롤 관성이 있고, Lenis도 자체 관성 계산을 수행 — 이중 적용 충돌
**How to avoid:** `syncTouch: false` 옵션 설정 (터치 디바이스에서 Lenis RAF 루프 비활성화, 네이티브 스크롤 위임)
**Warning signs:** 스크롤 속도가 2배로 느껴지거나, 손을 뗀 후 스크롤이 갑자기 멈춤

### Pitfall 2: GSAP 카운트업 hydration mismatch
**What goes wrong:** 서버에서 렌더링된 스코어 숫자와 클라이언트 초기 렌더 사이 React hydration 불일치 경고
**Why it happens:** GSAP이 DOM의 textContent를 직접 조작 — React의 reconciliation 밖에서 동작
**How to avoid:** 페이지 컴포넌트에 `'use client'` 지시자 필수. 서버 컴포넌트에서 GSAP 절대 사용 불가
**Warning signs:** 콘솔에 "Text content did not match" 경고

### Pitfall 3: inning_data JSONB 형식 미정의
**What goes wrong:** `inning_data`는 DB에 `jsonb | null`로 저장되지만 실제 구조가 코드에 타입 정의 없이 사용되면 런타임 오류
**Why it happens:** `game-repository.ts`에서 `inning_data: null`로 upsert하고 있어 현재 DB에는 이닝 데이터가 없을 가능성 높음. kbo-game 패키지가 이닝 데이터를 제공하는지 확인 필요
**How to avoid:** `inning_data`가 null인 경우에도 테이블을 graceful하게 렌더링. 이닝 데이터가 없으면 테이블 섹션을 숨기거나 "-" 표시
**Warning signs:** 경기 결과 화면에서 테이블 렌더링 시 TypeError

### Pitfall 4: lenis CSS import 누락
**What goes wrong:** `lenis/dist/lenis.css` import 없이 사용 시 스크롤 위치 계산이 어긋나거나 요소가 잘못 배치됨
**Why it happens:** Lenis는 내부적으로 특정 CSS 변수를 사용해 스크롤 오프셋 계산
**How to avoid:** 컴포넌트 파일 최상단에 `import 'lenis/dist/lenis.css'` 추가
**Warning signs:** 스크롤 위치가 올바르지 않거나 sticky 요소가 예상 위치에 없음

### Pitfall 5: 뒤로가기 히스토리 스택 (D-09)
**What goes wrong:** `router.push('/game/id')`로 결과 화면 진입 시 뒤로가기 히스토리에 `/game/id` → `(이전 화면)` 순서로 쌓임. 토스 미니앱에서 앱 뒤로가기 제스처가 의도치 않은 화면으로 이동
**Why it happens:** 푸시 알림 딥링크는 직접 `/game/id`로 진입하기 때문에 히스토리 스택이 없거나 예측 불가
**How to avoid:** 결과 화면에서 메인으로 돌아가는 버튼은 `router.replace('/')` 사용. 딥링크 진입 시 히스토리 스택에 메인 화면을 추가하거나 단순히 replace로 처리

---

## Data Shape Analysis

### games 테이블 (실제 DB 스키마 기준)
```typescript
// src/types/game.ts — 실제 확인된 타입
type Game = {
  id: string                              // uuid — /game/[id] 라우트 파라미터
  game_date: string                       // date — "2026-04-05"
  home_team: string                       // TeamCode — "LG", "KT" 등
  away_team: string                       // TeamCode
  status: GameStatus                      // 'scheduled' | 'playing' | 'finished' | 'cancelled'
  home_score: number                      // 최종 홈팀 점수 (UI-02)
  away_score: number                      // 최종 원정팀 점수 (UI-02)
  inning_data: Record<string, unknown> | null  // JSONB — 이닝별 점수 (UI-02, 주의사항 있음)
  started_at: string | null
  finished_at: string | null
  is_notified_start: boolean
  is_notified_finish: boolean
  is_notified_cancel: boolean
  created_at: string
  updated_at: string
}
```

### inning_data 구조 주의사항
현재 `game-repository.ts`의 syncGames()에서 `inning_data: null`로 고정 upsert하고 있다 (Phase 2 구현). kbo-game 패키지가 이닝 데이터를 제공하더라도 현재 코드에서는 저장하지 않는 상태다.

**결론:** Phase 4에서 이닝 테이블을 렌더링하려면 두 가지 옵션 중 하나를 선택해야 한다:
1. `inning_data`가 null이면 이닝 테이블을 표시하지 않음 (MVP 안전)
2. game-repository에서 kbo-game 이닝 데이터를 실제로 저장하도록 수정 (범위 확장)

D-02에서 이닝별 점수 표시를 요구사항으로 정의했으므로, 플래너는 game-repository 수정 여부를 결정해야 한다.

### 팀 정보 조회 패턴
```typescript
// src/types/user.ts — 기존 확인된 패턴
import { KBO_TEAMS } from '@/types/user'

const homeTeam = KBO_TEAMS.find(t => t.code === game.home_team)
// homeTeam.name → "LG 트윈스"
// homeTeam.logo → "/teams/LG.png"
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm install gsap lenis | ✓ | (프로젝트 기존 환경) | — |
| gsap | UI-03 | ✗ (미설치) | — | 설치 필요: `pnpm add gsap @gsap/react` |
| lenis | UI-04 | ✗ (미설치) | — | 설치 필요: `pnpm add lenis` |
| Supabase (기존) | UI-01, UI-02 | ✓ | ^0.10.0 | — |
| Next.js App Router (기존) | UI-01, D-08 | ✓ | 16.2.2 | — |

**Missing dependencies with no fallback:**
- `gsap` + `@gsap/react` — UI-03 구현 전 Wave 0에서 설치 필요
- `lenis` — UI-04 구현 전 Wave 0에서 설치 필요

**Missing dependencies with fallback:**
- 없음

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `pnpm test --run src/app/(main)/game` |
| Full suite command | `pnpm test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | `/api/games/[id]` route — 유효 ID 반환 200, 없는 ID 404 반환 | unit (API Route) | `pnpm test --run src/app/api/games` | ❌ Wave 0 |
| UI-01 | `/api/games/today` route — 오늘 경기 목록 반환 | unit (API Route) | `pnpm test --run src/app/api/games` | ❌ Wave 0 |
| UI-02 | ScoreBoard 컴포넌트 — home_score/away_score 올바르게 렌더링 | unit (component) | `pnpm test --run src/components` | ❌ Wave 0 |
| UI-02 | InningTable 컴포넌트 — inning_data null 시 graceful 렌더 | unit (component) | `pnpm test --run src/components` | ❌ Wave 0 |
| UI-03 | GSAP 카운트업 — useGSAP 훅 실행, gsap.from 호출 확인 | unit (spy) | `pnpm test --run src/app/(main)/game` | ❌ Wave 0 |
| UI-04 | Lenis 초기화/소멸 — mount 시 Lenis 생성, unmount 시 destroy 호출 | unit (mock) | `pnpm test --run src/app/(main)/game` | ❌ Wave 0 |
| UI-05 | 결과 화면 — rounded-2xl, bg-white, #0064FF 클래스 포함 확인 | unit (render) | `pnpm test --run src/app/(main)/game` | ❌ Wave 0 |
| D-08 | 잘못된 gameId → API 404 → 클라이언트 redirect('/') | unit (mock fetch) | `pnpm test --run src/app/(main)/game` | ❌ Wave 0 |

**주의:** GSAP/Lenis는 DOM 조작 및 RAF 루프를 사용하므로 vitest jsdom 환경에서 실제 애니메이션 실행은 불가. 대신 `vi.mock('gsap')`, `vi.mock('lenis')` 로 모듈 자체를 모킹하고 `gsap.from`이 올바른 인자로 호출되었는지만 검증한다.

### Sampling Rate
- **Per task commit:** `pnpm test --run src/app/(main)/game src/components src/app/api/games`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/(main)/game/[id]/__tests__/page.test.tsx` — UI-01, UI-03, UI-04, UI-05, D-08 커버
- [ ] `src/components/__tests__/ScoreBoard.test.tsx` — UI-02, UI-03
- [ ] `src/components/__tests__/InningTable.test.tsx` — UI-02
- [ ] `src/components/__tests__/GameCard.test.tsx` — D-06
- [ ] `src/app/api/games/__tests__/today.test.ts` — D-06, D-07
- [ ] `src/app/api/games/__tests__/[id].test.ts` — UI-01, UI-02, D-08

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @studio-freight/lenis | lenis (standalone) | 2024년 패키지 이전 | import 경로 변경: `import Lenis from 'lenis'` |
| useLayoutEffect + gsap cleanup 수동 | useGSAP hook | GSAP 3.12+ | SSR 안전, 자동 cleanup, contextSafe 제공 |
| Pages Router getServerSideProps | App Router + Server Components + API Routes | Next.js 13+ | 이 프로젝트는 이미 App Router 사용 중 |

**Deprecated/outdated:**
- `@studio-freight/lenis`: deprecated, `lenis`로 대체
- GSAP `useLayoutEffect` 직접 래핑: `@gsap/react` useGSAP으로 대체

---

## Open Questions

1. **inning_data 실제 저장 여부**
   - What we know: `game-repository.ts`가 현재 `inning_data: null`로 upsert. DB 스키마에는 jsonb 컬럼 존재
   - What's unclear: kbo-game 패키지가 이닝별 데이터를 실제로 제공하는지, 어떤 형식인지 (STATE.md에 "스코어, 이닝 제공"이라고만 언급됨)
   - Recommendation: Wave 0 또는 Wave 1에서 game-repository.ts를 수정하여 kbo-game 이닝 데이터를 파싱/저장하거나, D-02를 "null이면 이닝 테이블 미표시"로 graceful 처리. 후자가 더 안전한 MVP 접근법

2. **GSAP 라이선스 (상업적 사용)**
   - What we know: GSAP 3.x는 클럽 멤버십 없이도 대부분의 플러그인을 포함하여 무료 사용 가능. 단, GreenSock 라이선스 조건에 따라 수익화 앱에서는 Business Green 라이선스 필요할 수 있음
   - What's unclear: 토스 미니앱 생태계 배포가 상업적 사용에 해당하는지
   - Recommendation: MVP 범위에서는 GSAP 무료 플랜으로 충분. 상용 출시 전 라이선스 검토 권장

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|------------------|
| `enum` 절대 금지 → 문자열 리터럴 유니온 | GameStatus, TeamCode 타입 그대로 사용 |
| `any` 타입 금지 → `unknown` + 타입 가드 | inning_data JSONB 파싱 시 반드시 타입 가드 |
| Zod 스키마로 외부 입력 검증 | API Route의 `params.id` 검증에 Zod 적용 |
| console.log 금지 → 적절한 로거 사용 | API Route 오류 로깅은 pino logger 사용 |
| TDD 필수 구간: Crawler, Auth, Polling, Push Provider | UI 컴포넌트는 TDD 필수 아님. 단 API Routes는 테스트 커버 권장 |
| 커밋 메시지: 한국어, 동사형 시작 | "추가: 경기 결과 화면 구현" 형식 |
| Over Engineering 금지 | GSAP은 스코어 카운트업만, Lenis는 결과 화면만 (D-04, D-05 이미 반영) |
| `type` 선호, `interface` 자제 | 새 타입 정의 시 `type` 사용 |

---

## Sources

### Primary (HIGH confidence)
- [GSAP React 공식 문서](https://gsap.com/resources/React/) — useGSAP hook, SSR 패턴, cleanup, contextSafe
- [Lenis 공식 사이트](https://lenis.darkroom.engineering/) — 패키지 정보, 옵션
- [bridger.to Lenis Next.js 가이드](https://bridger.to/lenis-nextjs) — App Router LenisProvider 패턴
- 프로젝트 코드베이스 직접 분석 — `src/types/game.ts`, `src/types/user.ts`, `src/app/(main)/page.tsx`, `game-repository.ts`, `vitest.config.mts`

### Secondary (MEDIUM confidence)
- [Chris9Soul GSAP countup 패턴](https://www.chris9soul.com/blog/animate-numbers-gsap/) — textContent + snap 패턴 검증
- WebSearch 결과 (GSAP Next.js App Router 2025) — useGSAP + "use client" 패턴 다수 소스 일치 확인
- WebSearch 결과 (Lenis mobile scroll) — syncTouch:false 권장사항

### Tertiary (LOW confidence)
- GSAP 라이선스 상업적 사용 관련 — 공식 라이선스 페이지 직접 확인 권장

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm 버전 직접 확인 (gsap 3.14.2, lenis 1.3.21), 공식 문서 검증
- Architecture: HIGH — 기존 코드베이스 패턴과 Next.js 공식 App Router 패턴 일치
- Pitfalls: MEDIUM — Lenis 웹뷰 충돌은 커뮤니티 이슈 기반, 토스 미니앱 특수 환경 실측 데이터 없음
- Data shape: HIGH — DB 스키마와 TypeScript 타입 파일 직접 확인

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (GSAP/Lenis 안정적, 30일 유효)

---

## RESEARCH COMPLETE
