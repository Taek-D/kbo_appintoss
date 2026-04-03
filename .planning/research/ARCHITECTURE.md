# Architecture Patterns

**Domain:** Sports game-end notification service (Toss mini-app)
**Researched:** 2026-04-03
**Confidence:** MEDIUM — Toss Push API docs are behind auth; constraints sourced from community posts and PROJECT.md. All other patterns HIGH confidence.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  TOSS MINI-APP (Client)                                         │
│  Next.js frontend served inside Toss app shell                  │
│  - Toss Login button → OAuth token                              │
│  - Team selector UI → POST /api/subscriptions                   │
│  - Game summary screen (loaded on notification tap)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│  NEXT.JS API ROUTES (Vercel Serverless)                         │
│  /api/auth          — Toss OAuth token exchange                 │
│  /api/subscriptions — CRUD for user team subscriptions          │
│  /api/games/[id]    — Game summary data (read-only)             │
│  /api/cron/poll     — Polling trigger endpoint (Vercel cron)    │
└──────┬──────────────────────┬───────────────────────────────────┘
       │                      │
       │ Supabase JS client   │ Internal fetch (cron trigger)
┌──────▼──────────┐   ┌───────▼───────────────────────────────────┐
│  SUPABASE       │   │  POLLING WORKER (Supabase Edge Function)  │
│  PostgreSQL DB  │   │                                           │
│                 │◄──│  1. Read active subscriptions             │
│  - users        │   │  2. Call kbo-game crawler                 │
│  - subscriptions│   │  3. Diff prev_state vs current_state      │
│  - games        │   │  4. On Playing→Finished: enqueue push     │
│  - push_queue   │   │  5. Write new game state to DB            │
│  - game_states  │   │                                           │
└──────┬──────────┘   └───────────────────────────────────────────┘
       │ pgmq (push_queue table)
┌──────▼──────────────────────────────────────────────────────────┐
│  PUSH DISPATCHER (Supabase Edge Function or Next.js API)        │
│                                                                 │
│  - Dequeue messages from push_queue                             │
│  - For each subscriber: POST to Toss Push API                   │
│  - Enforce 100ms gap between sends (sequential, not parallel)   │
│  - mTLS cert attached to outbound HTTPS requests                │
│  - On failure: retry with exponential backoff, max 3 attempts   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ mTLS (server cert + key)
┌──────────────────────▼──────────────────────────────────────────┐
│  TOSS PUSH API (External)                                       │
│  Receives push payload → delivers to Toss app on user device    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Toss Mini-App Frontend** | Team selection, subscription management, game summary display | Next.js API Routes (HTTPS) |
| **Auth Module** (Next.js API) | Toss OAuth token exchange, session management via Supabase Auth | Toss OAuth endpoint, Supabase |
| **Subscription API** (Next.js API) | Store and retrieve user → team mappings | Supabase DB |
| **Game Summary API** (Next.js API) | Serve cached game result data for notification deep-link | Supabase DB (games table) |
| **Crawler** (kbo-game npm wrapper) | Fetch current KBO game state for all games in progress | KBO data source (external HTTP) |
| **Polling Worker** (Supabase Edge Function + pg_cron) | Periodically invoke Crawler, detect state transitions, enqueue push jobs | Crawler, Supabase DB, push_queue |
| **Push Dispatcher** (Supabase Edge Function or Next.js API route) | Dequeue push jobs, rate-limit, send via Toss Push API with mTLS | push_queue (pgmq), Toss Push API |
| **Supabase DB** | Source of truth for users, subscriptions, game states, push queue | All server components |

## Data Flow

### Subscription Flow (user onboarding)
```
User opens mini-app
  → Toss Login (OAuth)
  → Auth Module issues session token, stores user in Supabase
  → User selects team
  → Subscription API writes { user_id, team_code, device_token } to subscriptions table
```

### Polling + Notification Flow (game day)
```
Vercel Cron (every 60s baseline, 30s near end)
  → POST /api/cron/poll  (or pg_cron → Edge Function directly)
  → Polling Worker calls kbo-game package for all games today
  → For each game:
      Compare current_state with game_states.last_known_state
      If Playing → Finished:
        Write final result to games table
        Query subscriptions for all users subscribed to either team
        Enqueue one push_queue record per user
  → Write new game_states snapshot
```

### Push Dispatch Flow
```
Push Dispatcher (triggered by pg_cron or separate cron, every 30s)
  → Dequeue N messages from push_queue (pgmq)
  → For each message (sequentially):
      Build Toss Push API payload
      POST with mTLS cert (100ms enforced delay between calls)
      On 2xx: mark delivered
      On 4xx/5xx: increment retry_count; re-enqueue if < 3, else mark failed
```

### Notification Tap Flow (deep-link)
```
User taps push notification
  → Toss app opens mini-app at /games/[game_id]
  → Game Summary API fetches pre-computed result from games table
  → Frontend renders interactive summary (GSAP + Lenis animations)
```

## Adaptive Polling Strategy

The polling interval is not fixed. This is the core resource-vs-latency tradeoff.

```
Game not started yet          → poll every 5 min  (low urgency)
Game in progress, inning 1-7  → poll every 60s    (standard)
Game in progress, inning 8+   → poll every 30s    (high urgency, end near)
Game finished                 → stop polling       (terminal state)
No games today                → poll once at schedule times, then idle
```

**Implementation:** Polling Worker reads game state from DB to decide next wakeup interval. Vercel Cron minimum resolution is 1 minute; sub-minute polling can be achieved with a self-scheduling Edge Function loop (with a hard timeout guard).

**Caution:** Supabase Edge Functions have a 150s max runtime on free tier. Self-looping workers must terminate before this limit. Prefer Vercel Cron for reliability.

## Patterns to Follow

### Pattern 1: State Snapshot Diffing
**What:** Store last known game state in DB; on each poll compare new state against stored state.
**When:** Any event-driven system built on polling (not webhooks).
**Why:** Makes transition detection (Playing → Finished) explicit, idempotent, and auditable.

```typescript
// game_states table
{ game_id, status, inning, score_home, score_away, polled_at }

// Transition detection
if (prev.status !== 'Finished' && current.status === 'Finished') {
  await enqueueNotifications(game_id)
}
```

### Pattern 2: Sequential Push Queue (not parallel fan-out)
**What:** Process push_queue messages one at a time with enforced 100ms gaps.
**When:** The Push API enforces a minimum interval between sends (Toss Push API constraint).
**Why:** Parallel fan-out would violate the rate limit; sequential processing with a counter ensures compliance.

```typescript
for (const job of jobs) {
  await sendPush(job)
  await sleep(100) // Toss Push API rate limit
}
// Use Promise.allSettled only across different GAMES, not across users of the same game
```

### Pattern 3: mTLS as Infrastructure Concern
**What:** Load mTLS cert and key from environment secrets; attach to all outbound Toss API calls at the HTTP client level.
**When:** All calls to Toss Push API, Toss Login, Toss Pay.
**Why:** Toss requires mutual TLS; cert management should be centralized, not scattered across route handlers.

```typescript
// Single shared https.Agent instance
const tossAgent = new https.Agent({
  cert: process.env.TOSS_MTLS_CERT,
  key: process.env.TOSS_MTLS_KEY,
})
```

### Pattern 4: Crawler as Pure Wrapper Module
**What:** Isolate the `kbo-game` package behind a typed `CrawlerService` interface.
**When:** Third-party data source may change schema or fail.
**Why:** Insulates the rest of the system; enables mocking in tests (TDD requirement).

```typescript
interface GameSnapshot {
  gameId: string
  status: 'Scheduled' | 'Playing' | 'Finished' | 'Cancelled'
  inning: number
  homeScore: number
  awayScore: number
}

class CrawlerService {
  async getTodayGames(): Promise<GameSnapshot[]> { ... }
  async getGameById(id: string): Promise<GameSnapshot> { ... }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parallel Push Fan-out
**What:** Sending all push notifications simultaneously with `Promise.all`.
**Why bad:** Violates Toss Push API 100ms rate limit; leads to 429 errors and dropped notifications.
**Instead:** Sequential dispatch from queue with enforced delay. Use `Promise.allSettled` only across independent GAME-level operations (not user-level sends).

### Anti-Pattern 2: Polling in API Route Request Lifecycle
**What:** Running the KBO crawler synchronously inside a user-facing API route.
**Why bad:** Vercel serverless functions have a 10–60s timeout; long-running polls block responses and waste invocation budget.
**Instead:** Cron-triggered background worker entirely separate from the user-facing request path.

### Anti-Pattern 3: Calling kbo-game Directly from Multiple Places
**What:** Importing `kbo-game` in multiple files (API routes, workers, tests).
**Why bad:** Breaks testability; hard to stub; couples business logic to data-source details.
**Instead:** Single `CrawlerService` class is the only consumer of `kbo-game`. Everything else depends on the interface.

### Anti-Pattern 4: Storing mTLS Cert on Disk in Repo
**What:** Committing cert/key files to version control or Vercel project files.
**Why bad:** Security breach; cert rotation becomes a deploy event.
**Instead:** Store as Vercel environment secrets; read from `process.env` at runtime only.

### Anti-Pattern 5: Polling Every Game Regardless of Schedule
**What:** Polling all KBO teams every 30s year-round.
**Why bad:** Unnecessary API load on kbo-game source and wasted Supabase Edge Function invocations.
**Instead:** Scheduler checks today's game list at startup; only polls active game IDs during game hours.

## Suggested Build Order (Phase Dependencies)

```
Phase 1: Data Layer
  Supabase schema (users, subscriptions, games, game_states, push_queue)
  ↓ required by everything else

Phase 2: Auth Module
  Toss Login OAuth → session → user record in Supabase
  ↓ required by Subscription API and frontend

Phase 3: Crawler Module
  kbo-game wrapper (CrawlerService) with full TDD test suite
  ↓ required by Polling Worker

Phase 4: Polling Worker
  pg_cron + Supabase Edge Function; state diff logic; enqueue on transition
  ↓ required by Push Dispatcher (queue producer before consumer)

Phase 5: Push Dispatcher
  pgmq consumer; mTLS setup; sequential send with rate-limit enforcement
  ↓ required by end-to-end notification flow

Phase 6: Game Summary UI
  Next.js page at /games/[id]; GSAP + Lenis animations; reads games table
  ↓ depends on Phase 1 (games table) and Phase 2 (auth)

Phase 7: Frontend Mini-App Shell
  Team selector; subscription management; integrates all prior phases
  ↓ depends on all prior phases
```

**Rationale:** DB schema and Auth are foundational — no other component can be built without them. Crawler must be isolated and tested before the Worker consumes it. The queue must be producing before the dispatcher consumes. UI is last because it only assembles already-working backend pieces.

## Scalability Considerations

| Concern | MVP (~100 users) | Growth (~10K users) | Scale (~100K+ users) |
|---------|-----------------|---------------------|----------------------|
| Push dispatch | Sequential loop in single Edge Function | pgmq with multiple dispatcher workers | Dedicated push microservice with horizontal workers |
| Polling | Single Vercel cron → single Edge Function | Same; stateless worker scales with cron frequency | Distributed game state cache (Redis) |
| DB load | Supabase free/pro tier sufficient | Add read replicas for subscriptions query | Partition subscriptions by team |
| mTLS cert rotation | Manual, every 390 days | Automate via Vercel env update CI | Secret manager (AWS Secrets Manager / Vault) |

## Component Diagram (Text)

```
[Toss App Shell]
      |
      | renders
      v
[Next.js Frontend]  ──── /api/auth ──────► [Toss OAuth]
      |                                          |
      | /api/subscriptions                       | user token
      v                                          v
[Supabase DB] ◄──────────────────────── [Auth Module]
      |    ^
      |    | read subscriptions / write game_states
      |    |
      v    |
[Polling Worker] ──► [CrawlerService] ──► [kbo-game pkg] ──► [KBO Data]
      |
      | enqueue on game end
      v
[push_queue (pgmq)]
      |
      | dequeue
      v
[Push Dispatcher] ──mTLS──► [Toss Push API] ──► [User Device]
```

## Sources

- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron) — HIGH confidence
- [Processing large jobs with Edge Functions, Cron, and Queues](https://supabase.com/blog/processing-large-jobs-with-edge-functions) — HIGH confidence
- [Build Queue Worker using Supabase Cron, Queue and Edge Function](https://dev.to/suciptoid/build-queue-worker-using-supabase-cron-queue-and-edge-function-19di) — MEDIUM confidence
- [Toss Apps-in-Toss Integration Process (mTLS)](https://developers-apps-in-toss.toss.im/development/integration-process.html) — MEDIUM confidence (fetched successfully)
- [앱인토스 개발자센터 Push 소개](https://developers-apps-in-toss.toss.im/push/intro.html) — LOW confidence (403/404, sourced from community)
- [Notification System Architecture — MagicBell](https://www.magicbell.com/blog/notification-system-design) — HIGH confidence
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs) — HIGH confidence
- [GitHub toss/apps-in-toss-examples](https://github.com/toss/apps-in-toss-examples) — MEDIUM confidence
- [Polling in System Design — GeeksforGeeks](https://www.geeksforgeeks.org/system-design/polling-in-system-design/) — MEDIUM confidence
