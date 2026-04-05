# Phase 2: Data Pipeline - Research

**Researched:** 2026-04-05
**Domain:** KBO 크롤러 + QStash 폴링 워커 + Supabase 상태 영속화
**Confidence:** HIGH

## Summary

Phase 2는 세 개의 독립 모듈로 구성된다. (1) kbo-game 패키지를 래핑하는 CrawlerService, (2) Upstash QStash Cron으로 3분마다 트리거되는 폴링 API Route, (3) 상태 전이를 감지하여 Supabase에 기록하는 GameRepository. kbo-game@0.0.2의 `getGame(Date)` 함수는 `Game[] | null`을 반환하며, `null`은 크롤링 실패, `[]`는 경기 없음으로 구분된다. 이 차이가 DATA-04 요구사항의 핵심이다.

QStash는 `@upstash/qstash` SDK로 통합하며, Next.js App Router에서 `Receiver`로 서명 검증 후 폴링 로직을 실행한다. 경기 시간대(14~22시 KST) 제한은 API Route 내부에서 시간 체크로 구현한다 — QStash 자체 cron expression은 UTC 기준이므로 KST 변환이 필요하다. Supabase upsert + `on_conflict` 전략으로 서버 재시작 후에도 상태가 복원되어 중복 알림이 방지된다(INFRA-03).

DATA-03(8회 이후 30초 폴링)은 CONTEXT.md에서 MVP 이후 최적화로 결정됨 — 이 단계에서 구현하지 않는다.

**Primary recommendation:** CrawlerService → GameRepository → Polling API Route 순서로 TDD 구현. kbo-game의 `GameStatus`(대문자) ↔ DB `GameStatus`(소문자) 매핑 레이어를 CrawlerService 내부에 캡슐화하라.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** kbo-game 패키지 실패 시 네이버 스포츠 크롤러 대체 없이 다음 폴링에서 자동 재시도만 수행
- **D-02:** 크롤링 에러는 기존 `src/lib/logger.ts` 로거를 통해 DB에 기록. 어드민 알림 없음 (MVP)
- **D-03:** kbo-game만 사용, fallback 크롤러 구현 없음
- **D-04:** 모든 상태 전이 감지 및 DB 기록 — Scheduled→Playing, Playing→Finished, Cancelled
- **D-05:** 세 가지 전이 모두 Phase 3 푸시 알림 트리거 대상
- **D-06:** `is_notified` 플래그(games 테이블)로 중복 알림 방지. 상태별 별도 플래그 필요 시 구현 시 판단
- **D-07:** Vercel Hobby 플랜 Cron 제한으로 Upstash QStash를 외부 Cron 스케줄러로 사용
- **D-08:** 3분 간격 폴링 (무료 한도 1,000회/일 대비 160회/일)
- **D-09:** 경기 시간대(14:00~22:00 KST)에만 실행
- **D-10:** QStash Cron Schedule 사용 — `vercel.json` cron 설정 아님
- **D-11:** 시즌 내 모든 경기 데이터 누적 보존
- **D-12:** Supabase Free 500MB DB 제한 고려, KBO 시즌(~720경기) 수준에서 문제없음

### Claude's Discretion
- CrawlerService 인터페이스 설계 세부사항 (kbo-game 래핑 방식)
- QStash 인증 (CRON_SECRET 또는 QStash 서명 검증 방식)
- 폴링 API Route 경로 및 구조
- 에러 재시도 시 exponential backoff 적용 여부
- is_notified 플래그를 상태별로 분리할지 단일 플래그로 유지할지

### Deferred Ideas (OUT OF SCOPE)
- 8회 이후 30초 폴링 주기 단축 (DATA-03) — MVP 이후 최적화
- 네이버 스포츠 크롤러 fallback — MVP에서 구현 안 함
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | 시스템은 kbo-game 패키지를 통해 당일 KBO 경기 데이터를 수집한다 | kbo-game@0.0.2 `getGame(Date)→Game[]|null` 확인. CrawlerService로 래핑 패턴 문서화 |
| DATA-02 | 시스템은 경기 상태 전이(Playing→Finished 포함 전체)를 정확히 감지한다 | DB에서 이전 상태 조회 후 비교하는 상태 전이 감지 패턴 문서화. `is_notified` 플래그 전략 |
| DATA-03 | 시스템은 8회 이후 폴링 주기를 30초로 단축 | MVP 이후 최적화로 결정됨 — 구현 불필요 |
| DATA-04 | 시스템은 크롤링 실패와 경기 없음을 구분하여 처리 | `null` vs `[]` 반환값으로 구분. 별도 코드 경로 패턴 문서화 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| kbo-game | 0.0.2 | KBO 공식 API 래핑, 경기 데이터 수집 | 프로젝트 결정 (D-03), KBO 공식 API 사용 |
| @upstash/qstash | ^2.x | QStash SDK — Cron 스케줄, 메시지 서명 검증 | D-07, Vercel Hobby Cron 한계 우회 |
| @supabase/ssr | ^0.10.0 | 서버 사이드 Supabase 클라이언트 | Phase 1에서 확립된 패턴 |
| zod | ^4.3.6 | kbo-game 응답 런타임 검증 | CLAUDE.md 타입 컨벤션 |
| pino | ^10.3.1 | 에러 로깅 | Phase 1에서 확립된 로거 |
| vitest | ^4.1.2 | TDD 테스트 프레임워크 | CLAUDE.md TDD 필수, Phase 1 확립 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| msw | ^2.12.14 | kbo-game HTTP 요청 모킹 | CrawlerService 단위 테스트 |

**Installation:**
```bash
pnpm add kbo-game @upstash/qstash
```

**Version verification (2026-04-05 기준):**
```bash
npm view kbo-game version       # 0.0.2 (latest, 2025-09-19 배포)
npm view @upstash/qstash version # 최신 버전 확인 필요
```

Note: kbo-game은 0.0.2가 최신이며 최근 업데이트 없음. 패키지가 KBO 공식 API를 직접 호출하므로 KBO API 변경 시 패키지가 깨질 수 있다 — 이 경우 D-01에 따라 재시도만 수행.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── backend/
│   └── modules/
│       ├── auth/                    # Phase 1 — 기존
│       └── crawler/                 # Phase 2 신규
│           ├── index.ts             # public API export
│           ├── crawler-service.ts   # CrawlerService 구현 (kbo-game 래핑)
│           ├── game-repository.ts   # Supabase CRUD + 상태 전이 감지
│           ├── game-state-mapper.ts # kbo-game GameStatus → DB GameStatus 매핑
│           └── __tests__/
│               ├── crawler-service.test.ts
│               └── game-repository.test.ts
├── app/
│   └── api/
│       ├── auth/                    # Phase 1 — 기존
│       └── cron/
│           └── poll/
│               └── route.ts         # QStash 폴링 엔드포인트
└── types/
    ├── game.ts                      # 기존 (GameStatus, Game)
    └── crawler.ts                   # 신규 (CrawlerGame, StateTransition 타입)
```

### Pattern 1: CrawlerService — kbo-game 래핑 + null/[] 구분

**What:** kbo-game의 `getGame(Date)` 호출을 캡슐화하고, `null`(크롤링 실패)과 `[]`(경기 없음)을 명확히 구분하는 Result 타입 반환.

**When to use:** DATA-01, DATA-04 요구사항 구현 시.

```typescript
// Source: kbo-game@0.0.2 GitHub src/index.ts 확인
// kbo-game의 GameStatus (대문자)
type KboGameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED'

// DB GameStatus (소문자, src/types/game.ts)
type GameStatus = 'scheduled' | 'playing' | 'finished' | 'cancelled'

// 상태 매핑 (game-state-mapper.ts)
function mapKboStatusToDb(kboStatus: KboGameStatus): GameStatus {
  const map: Record<KboGameStatus, GameStatus> = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'playing',
    FINISHED: 'finished',
    CANCELED: 'cancelled',  // kbo-game은 CANCELED (D 없음), DB는 cancelled
  }
  return map[kboStatus]
}

// CrawlerResult 타입 (types/crawler.ts)
type CrawlerResult =
  | { success: true; games: CrawlerGame[] }  // [] 포함 — 경기 없음도 성공
  | { success: false; error: Error }          // null 반환 — 크롤링 실패

// CrawlerService 구현
async function fetchTodayGames(): Promise<CrawlerResult> {
  try {
    const games = await getGame(new Date())
    // null = 크롤링 실패 (네트워크 오류 등)
    if (games === null) {
      return { success: false, error: new Error('kbo-game returned null') }
    }
    // [] = 경기 없음 (성공, 빈 배열)
    return { success: true, games: games.map(mapToInternalGame) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) }
  }
}
```

**핵심:** `null`과 `[]`를 동일 코드 경로로 처리하면 DATA-04 위반. 반드시 분리.

### Pattern 2: GameRepository — 상태 전이 감지 + Supabase upsert

**What:** DB에서 이전 상태를 읽어 크롤링 결과와 비교, 변경된 경우만 업데이트 + 상태 전이 이벤트 반환.

**When to use:** DATA-02, INFRA-03 요구사항 구현 시.

```typescript
// Source: supabase/migrations/20260404000000_init_schema.sql 기반
// Supabase upsert 패턴 — 기존 games 테이블 스키마 기반

type StateTransition = {
  gameId: string
  fromStatus: GameStatus
  toStatus: GameStatus
  game: Game
}

async function syncGames(crawledGames: CrawlerGame[]): Promise<StateTransition[]> {
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. DB에서 오늘 경기 현재 상태 조회 (INFRA-03: 서버 재시작 후 복원)
  const { data: existingGames } = await supabase
    .from('games')
    .select('*')
    .eq('game_date', today)

  const existingMap = new Map(existingGames?.map(g => [g.id, g]) ?? [])
  const transitions: StateTransition[] = []

  for (const crawled of crawledGames) {
    const existing = existingMap.get(crawled.id)
    const newStatus = mapKboStatusToDb(crawled.status)

    // upsert — game_date + home_team + away_team으로 중복 방지
    await supabase.from('games').upsert(
      { ...mapToDbGame(crawled), status: newStatus },
      { onConflict: 'game_date,home_team,away_team' }
    )

    // 상태 전이 감지
    if (existing && existing.status !== newStatus) {
      transitions.push({
        gameId: crawled.id,
        fromStatus: existing.status as GameStatus,
        toStatus: newStatus,
        game: mapToGame(crawled),
      })
    }
  }

  return transitions
}
```

### Pattern 3: QStash 폴링 API Route + 서명 검증

**What:** QStash가 3분마다 POST 호출하는 Next.js App Router 엔드포인트. Receiver로 서명 검증 후 폴링 로직 실행.

**When to use:** D-07, D-08, D-09 결정 구현 시.

```typescript
// Source: Upstash QStash 공식 문서
// src/app/api/cron/poll/route.ts
import { Receiver } from '@upstash/qstash'
import { logger } from '@/lib/logger'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export async function POST(req: Request): Promise<Response> {
  // 1. QStash 서명 검증 (D-07)
  const signature = req.headers.get('Upstash-Signature')
  if (!signature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.text()
  try {
    await receiver.verify({ body, signature, url: process.env.POLLING_URL! })
  } catch {
    return new Response('Invalid signature', { status: 401 })
  }

  // 2. 경기 시간대 체크 (D-09: 14~22시 KST)
  const kstHour = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  ).getHours()
  if (kstHour < 14 || kstHour >= 22) {
    return new Response('Outside game hours', { status: 200 })
  }

  // 3. 크롤링 + 상태 전이 감지
  const result = await fetchTodayGames()
  if (!result.success) {
    logger.error({ error: result.error.message }, 'Crawling failed — will retry next poll')
    return new Response('Crawl failed', { status: 200 })  // 200: QStash 재시도 안 함
  }

  const transitions = await syncGames(result.games)
  // transitions는 Phase 3 연결점 — 현재는 로깅만
  logger.info({ transitionCount: transitions.length }, 'Poll complete')

  return new Response('OK', { status: 200 })
}
```

**중요:** 크롤링 실패 시 500이 아닌 200을 반환해야 한다. QStash는 5xx 응답 시 자동 재시도하므로, D-01(단순 재시도)과 충돌할 수 있다. 실패를 로깅만 하고 200을 반환하면 QStash가 다음 Cron 주기(3분 후)에 자연스럽게 재시도한다.

### Pattern 4: QStash Cron Schedule 등록

**What:** QStash Dashboard 또는 SDK로 3분 간격 Cron Schedule 생성.

```typescript
// 초기 설정 스크립트 (scripts/setup-qstash.ts) — 1회 실행
import { Client } from '@upstash/qstash'

const client = new Client({ token: process.env.QSTASH_TOKEN! })
await client.schedules.create({
  destination: 'https://your-app.vercel.app/api/cron/poll',
  cron: '*/3 * * * *',  // 3분마다 (UTC — KST 변환은 API Route 내부에서 처리)
})
```

### Anti-Patterns to Avoid

- **kbo-game null을 빈 배열처럼 처리:** `null ?? []`로 처리하면 DATA-04 위반. 반드시 별도 코드 경로.
- **QStash 서명 검증 생략:** 인증 없이 공개 엔드포인트로 두면 누구나 폴링 트리거 가능. Receiver 검증 필수.
- **크롤링 실패 시 500 반환:** QStash가 자동 재시도 → 불필요한 재시도 루프. 200 반환 후 다음 Cron 주기 대기.
- **kbo-game GameStatus 대문자를 DB에 직접 저장:** DB GameStatus는 소문자(`'playing'`). 매핑 레이어 없이 직접 저장하면 타입 불일치.
- **KST 시간대를 UTC로 착각:** `new Date().getHours()`는 서버 TZ 기준. Vercel 서버는 UTC이므로 반드시 KST 변환 필요.
- **상태 전이 없이 매번 is_notified 리셋:** upsert 시 `is_notified`를 덮어쓰면 중복 알림 발생. UPDATE 시 `is_notified` 필드 제외.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| KBO 경기 데이터 수집 | 직접 KBO API POST 호출 파서 | kbo-game@0.0.2 | KBO API는 비공개 + form-encoded 파라미터 복잡. 패키지가 이미 처리 |
| QStash 서명 검증 | JWT 직접 파싱/HMAC 계산 | `@upstash/qstash` Receiver | 키 로테이션, base64 body 해시 등 엣지 케이스 많음 |
| Cron 스케줄러 | Vercel Cron (vercel.json) | QStash Cron Schedule | Vercel Hobby는 하루 1회 제한 (D-07) |
| DB upsert 충돌 처리 | 직접 SELECT → INSERT/UPDATE | Supabase `.upsert()` + `onConflict` | Supabase upsert가 atomic하게 처리 |

**Key insight:** kbo-game 패키지가 KBO 공식 API의 복잡한 form-encoded 요청, 상태 코드 매핑, 50개 이상의 필드 파싱을 모두 처리한다. 이 레이어를 직접 구현하면 KBO API 변경 시 유지보수 비용이 급증한다.

---

## Common Pitfalls

### Pitfall 1: kbo-game GameStatus 케이스 불일치
**What goes wrong:** kbo-game은 `'CANCELED'`(D 없음), DB `game.ts`는 `'cancelled'`(D 있음, 소문자). 직접 대입하면 타입 에러 또는 런타임 불일치.
**Why it happens:** kbo-game은 미국식 철자(CANCELED), 프로젝트는 영국식(cancelled) 채택.
**How to avoid:** `game-state-mapper.ts`에서 명시적 매핑 테이블 사용. Zod로 kbo-game 반환값 런타임 검증.
**Warning signs:** TypeScript 에러 없이 DB에 `'CANCELED'`가 저장되는 경우.

### Pitfall 2: QStash Cron UTC/KST 혼동
**What goes wrong:** QStash cron `*/3 14-22 * * *`으로 설정하면 UTC 14~22시 = KST 23~07시에 실행됨.
**Why it happens:** QStash cron expression은 UTC 기준.
**How to avoid:** QStash cron은 `*/3 * * * *`(항상 실행)로 설정하고, API Route 내부에서 KST 시간 체크로 조기 종료. 또는 KST 오프셋(UTC+9)을 계산하여 `*/3 5-13 * * *`으로 설정(14:00~22:00 KST = UTC 05:00~13:00).
**Warning signs:** 새벽 시간에도 폴링이 실행되거나, 낮 경기가 감지되지 않음.

### Pitfall 3: is_notified 플래그 upsert 덮어쓰기
**What goes wrong:** 경기 데이터 upsert 시 `is_notified: false`가 기본값으로 포함되어 알림 발송 후 플래그가 리셋됨.
**Why it happens:** Supabase upsert는 충돌 시 지정된 모든 필드를 덮어씀.
**How to avoid:** upsert 페이로드에서 `is_notified` 필드를 제외하거나, `ignoreDuplicates: false` + 별도 UPDATE 쿼리 사용.
**Warning signs:** 동일 경기에 대해 알림이 반복 발송됨.

### Pitfall 4: Vercel 서버리스 함수 실행 시간 초과
**What goes wrong:** QStash 폴링 엔드포인트가 kbo-game 네트워크 호출 + DB upsert로 10초 이상 소요 시 Vercel Hobby 플랜(10초 타임아웃) 초과.
**Why it happens:** Vercel Hobby 플랜은 서버리스 함수 최대 실행 시간이 10초.
**How to avoid:** kbo-game 호출에 타임아웃(5초) 설정. DB 작업 최소화(오늘 경기만 조회). 타임아웃 시 200 반환 후 다음 폴링 주기 대기.
**Warning signs:** Vercel 함수 로그에 "Function execution timed out" 메시지.

### Pitfall 5: 상태 전이 중복 감지
**What goes wrong:** 같은 폴링 주기에 상태 전이가 중복 감지되어 Phase 3에서 알림이 2회 발송됨.
**Why it happens:** upsert가 완료되기 전에 다음 폴링이 시작되거나, `is_notified` 체크 전에 트리거됨.
**How to avoid:** 상태 전이 감지 후 즉시 `is_notified: true`로 업데이트(for 경기 종료). Phase 3 연결 시 `is_notified` 체크를 원자적으로 수행.
**Warning signs:** push_logs 테이블에 동일 game_id로 2개 이상 레코드.

---

## Code Examples

### kbo-game getGame 호출 패턴

```typescript
// Source: github.com/vkehfdl1/kbo-game src/index.ts (확인됨)
import { getGame } from 'kbo-game'

// getGame은 Date 객체 필수 (문자열 안 됨 — PROJECT.md 명시)
const games = await getGame(new Date())
// 반환: Game[] | null
// null = 크롤링 실패 (KBO API 오류, 네트워크 오류 등)
// [] = 경기 없음 (비시즌, 우천취소 후 미등록 등)
```

### kbo-game Game 타입 구조

```typescript
// Source: github.com/vkehfdl1/kbo-game src/index.ts (WebFetch 확인)
// kbo-game의 Game 인터페이스 (주요 필드)
type KboGame = {
  // 식별자
  id: string
  date: string      // YYYYMMDD
  startTime: string
  season: string
  // 팀
  homeTeam: string
  awayTeam: string
  // 상태 & 스코어
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED'
  homeScore: number
  awayScore: number
  // 이닝 (경기 결과 UI Phase 4에서 사용)
  currentInning: number
  // 투수 정보 (Phase 2에서는 불필요, DB에 저장 가능)
}
```

### Supabase 서버 클라이언트 패턴 (확립됨)

```typescript
// Source: src/lib/supabase/server.ts (기존)
// API Route에서 Supabase 접근 시 반드시 이 패턴 사용
import { createServerSupabaseClient } from '@/lib/supabase/server'

const supabase = await createServerSupabaseClient()
```

### vitest 모킹 패턴 (기존 패턴 준수)

```typescript
// Source: src/backend/modules/auth/__tests__/user-repository.test.ts 패턴 준수
// kbo-game 모킹
vi.mock('kbo-game', () => ({
  getGame: vi.fn(),
}))

import { getGame } from 'kbo-game'
const mockGetGame = vi.mocked(getGame)

// 크롤링 실패 케이스 (DATA-04)
mockGetGame.mockResolvedValue(null)

// 경기 없음 케이스 (DATA-04)
mockGetGame.mockResolvedValue([])

// 정상 케이스
mockGetGame.mockResolvedValue([mockKboGame])
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Cron (vercel.json) | Upstash QStash Cron | Phase 2 결정 (D-07) | Hobby 플랜 1회/일 → 3분 간격 가능 |
| BullMQ 퍼시스턴트 워커 | QStash + Vercel API Route | Phase 2 결정 | 별도 서버(Fly.io) 불필요, 서버리스로 처리 |
| 가변 폴링(30초) | 고정 3분 폴링 | MVP 결정 | MVP 이후 최적화로 연기 |

**주의:** ROADMAP.md의 Phase 2 Plans 설명("BullMQ 기반 가변 폴링 워커", "Fly.io/Railway 배포")은 초기 계획이며 CONTEXT.md 결정으로 대체되었다. BullMQ와 Fly.io는 이 Phase에서 사용하지 않는다.

---

## Open Questions

1. **games 테이블 upsert conflict key**
   - What we know: games 테이블에 `id uuid primary key`가 있으나, kbo-game의 game.id가 DB uuid와 동일한지 불명확
   - What's unclear: kbo-game game.id가 KBO 내부 ID(문자열)인지, upsert onConflict를 id로 할지 `game_date+home_team+away_team` 복합키로 할지
   - Recommendation: kbo-game의 실제 id 포맷 확인 후 upsert 전략 결정. 안전하게 `game_date,home_team,away_team` 복합 unique 제약 추가 마이그레이션 고려

2. **is_notified 단일 플래그 vs 상태별 분리**
   - What we know: D-06에서 구현 시 판단하도록 위임됨. 현재 games 테이블에는 단일 `is_notified` 컬럼
   - What's unclear: 경기 시작(Scheduled→Playing)과 경기 종료(Playing→Finished)를 모두 알림 대상으로 할 때, 단일 플래그로는 시작 알림 발송 후 종료 알림이 차단될 수 있음
   - Recommendation: `is_notified_start boolean default false`, `is_notified_finish boolean default false`, `is_notified_cancel boolean default false`로 분리. 추가 마이그레이션 필요.

3. **POLLING_URL 환경변수 처리**
   - What we know: QStash Receiver.verify()는 url 파라미터 필요 (요청 URL 검증용)
   - What's unclear: Vercel 배포 URL이 동적으로 변할 수 있음 (Preview 배포 등)
   - Recommendation: `VERCEL_URL` 환경변수(Vercel 자동 주입) 또는 `NEXT_PUBLIC_APP_URL` 커스텀 변수 사용

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 런타임 | ✓ | v22.17.1 | — |
| pnpm | 패키지 관리 | ✓ | 10.29.3 | — |
| kbo-game | DATA-01 | ✗ (미설치) | 0.0.2 (npm) | — (D-03: 대체 없음) |
| @upstash/qstash | D-07 | ✗ (미설치) | 최신 확인 필요 | — (필수) |
| Supabase | DB 영속화 | ✓ (Phase 1 설정) | @supabase/ssr 0.10.0 | — |
| Vitest | TDD | ✓ | ^4.1.2 | — |

**Missing dependencies with no fallback:**
- `kbo-game`: Phase 2의 유일한 데이터 소스. Wave 0에서 `pnpm add kbo-game` 필수.
- `@upstash/qstash`: QStash 서명 검증에 필요. Wave 0에서 `pnpm add @upstash/qstash` 필수.

**Required environment variables (신규):**
- `QSTASH_TOKEN` — QStash Cron Schedule 생성 (SDK Client)
- `QSTASH_CURRENT_SIGNING_KEY` — 서명 검증
- `QSTASH_NEXT_SIGNING_KEY` — 서명 검증 (키 로테이션 지원)
- `POLLING_URL` 또는 `NEXT_PUBLIC_APP_URL` — Receiver.verify() url 파라미터

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.mts` (기존) |
| Quick run command | `pnpm test --run src/backend/modules/crawler` |
| Full suite command | `pnpm test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `fetchTodayGames()` — kbo-game 호출, Game[] 반환 | unit | `pnpm test --run src/backend/modules/crawler/__tests__/crawler-service.test.ts` | ❌ Wave 0 |
| DATA-04 | null 반환 시 `{ success: false }`, [] 반환 시 `{ success: true, games: [] }` | unit | 위와 동일 파일 | ❌ Wave 0 |
| DATA-02 | `syncGames()` — 이전/현재 상태 비교, StateTransition[] 반환 | unit | `pnpm test --run src/backend/modules/crawler/__tests__/game-repository.test.ts` | ❌ Wave 0 |
| DATA-02 | Scheduled→Playing, Playing→Finished, Cancelled 전이 각각 감지 | unit | 위와 동일 파일 | ❌ Wave 0 |
| DATA-02 | `is_notified` 필드 upsert 시 덮어쓰지 않음 | unit | 위와 동일 파일 | ❌ Wave 0 |
| INFRA-03 | 서버 재시작 후 DB에서 기존 상태 복원 (중복 알림 없음) | unit | 위와 동일 파일 | ❌ Wave 0 |
| DATA-04 | 크롤링 에러는 logger.error 호출, 200 반환 | unit | `pnpm test --run src/app/api/cron/poll` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test --run src/backend/modules/crawler`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/backend/modules/crawler/__tests__/crawler-service.test.ts` — DATA-01, DATA-04
- [ ] `src/backend/modules/crawler/__tests__/game-repository.test.ts` — DATA-02, INFRA-03
- [ ] `src/backend/modules/crawler/index.ts` — public API export 파일
- [ ] `src/types/crawler.ts` — CrawlerResult, CrawlerGame, StateTransition 타입
- [ ] 마이그레이션: `is_notified` 단일 → 상태별 플래그 분리 (Open Question 2)
- [ ] 마이그레이션: `games` 테이블에 복합 unique 제약 추가 (Open Question 1)
- [ ] 패키지 설치: `pnpm add kbo-game @upstash/qstash`

---

## Project Constraints (from CLAUDE.md)

| Directive | Enforcement |
|-----------|-------------|
| TDD 필수 구간 — Crawler, Polling Worker | 테스트 먼저 작성 후 구현 |
| `enum` 절대 금지 → 문자열 리터럴 유니온 | `GameStatus`, `CrawlerResult` 등 모두 union type |
| `any` 타입 금지 → `unknown` + 타입 가드 | kbo-game 응답을 Zod로 런타임 검증 |
| Zod 스키마로 외부 입력 검증 | kbo-game 반환값 Zod 스키마 정의 필수 |
| `console.log` 금지 → pino logger | 모든 로깅은 `src/lib/logger.ts` 사용 |
| 모듈 간 통신은 `index.ts` public API | `src/backend/modules/crawler/index.ts` 통해서만 외부 접근 |
| 모듈 간 공유 타입은 `types/` 디렉토리 | `CrawlerResult`, `StateTransition` → `src/types/crawler.ts` |
| `@supabase/ssr` 사용 (deprecated auth-helpers 금지) | `createServerSupabaseClient()` 패턴 유지 |

---

## Sources

### Primary (HIGH confidence)
- github.com/vkehfdl1/kbo-game src/index.ts — `getGame(Date)→Game[]|null`, `GameStatus` union, 전체 Game 타입 구조 (WebFetch 확인)
- npm registry `kbo-game@0.0.2` — 버전, 배포일(2025-09-19), ESM 모듈 타입 확인
- Upstash QStash 공식 문서 (upstash.com/docs) — Receiver 서명 검증, schedules.create(), cron expression
- `src/types/game.ts`, `supabase/migrations/20260404000000_init_schema.sql` — 기존 DB 스키마 직접 확인
- `vitest.config.mts`, `src/backend/modules/auth/__tests__/user-repository.test.ts` — 기존 테스트 패턴 직접 확인

### Secondary (MEDIUM confidence)
- WebSearch: Upstash QStash 무료 플랜 1,000 메시지/일 (2025-10-03 블로그 기준, 이전 500에서 증가)
- WebFetch upstash.com/docs/qstash/howto/signature — Receiver 패턴, env var 이름 확인

### Tertiary (LOW confidence)
- kbo-game Game 타입 세부 필드명 (camelCase) — WebFetch로 구조 확인했으나 정확한 필드 목록은 패키지 설치 후 타입 파일로 최종 확인 필요

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — kbo-game npm 메타데이터, QStash 공식 문서, 기존 package.json 직접 확인
- Architecture: HIGH — 기존 auth 모듈 패턴 직접 확인, DB 스키마 직접 확인
- Pitfalls: HIGH — kbo-game 소스 확인(CANCELED vs cancelled), Vercel 타임아웃 공식 제한, QStash UTC 동작 공식 문서

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (kbo-game 0.0.2는 안정적, QStash API는 stable)
