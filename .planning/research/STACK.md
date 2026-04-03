# Technology Stack

**Project:** KBO 야구 알리미 (Toss Mini-App)
**Researched:** 2026-04-03
**Overall confidence:** MEDIUM-HIGH

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.x (latest stable) | Full-stack framework | App Router + React Server Components + Turbopack default. Vercel-native. Server Actions replace separate API layer for simple mutations. Toss examples repo uses TypeScript/React. |
| React | 19.2 (bundled with Next.js 16) | UI library | Required by Next.js 16. React Compiler (stable) reduces manual memoization — useful for animation-heavy result screen. |
| TypeScript | 5.1+ (required by Next.js 16) | Type safety | TDD mandate in PROJECT.md requires strict types for Auth, Crawler, Polling Worker, Push Provider modules. |

**Note on Next.js version:** Next.js 16 (released Oct 2025) is current stable. Creates apps with Turbopack by default, React Compiler support stable, proxy.ts replaces middleware.ts. Use `npx create-next-app@latest` which targets 16.x. Confidence: HIGH (verified via official nextjs.org/blog/next-16).

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | v4.x (released Jan 2025) | Utility-first CSS | CSS-first config via `@theme`, zero tailwind.config.js needed, 5x faster builds. Standard in `create-next-app` scaffolding in 2025. Toss white-tone, rounded-corner aesthetic maps well to utility classes. |
| shadcn/ui | latest (Tailwind v4 + React 19 compatible) | Headless component primitives | Copy-paste components (not an npm dep), fully owned, Tailwind v4 compatible as of 2025. Use for subscription forms, team selector, result card shells. |

---

### Backend / Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | `@supabase/supabase-js` 2.101.x | PostgreSQL DB + Auth + Realtime | PROJECT.md mandates Supabase. Built-in row-level security for user subscription data. Auth module handles Toss login token persistence. Realtime Postgres Changes available if push workers need to react to DB events. |
| `@supabase/ssr` | latest | SSR-aware Supabase client for Next.js | Required for server components and Route Handlers in Next.js App Router. Replaces deprecated `@supabase/auth-helpers-nextjs`. Confidence: HIGH (verified supabase.com/docs). |

---

### KBO Data Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `kbo-game` | (verify on npm before install) | KBO live game data crawling | PROJECT.md mandates this package. **Caution:** This package did not appear in public GitHub/npm searches — it may be private, internal, or unpublished yet. Wrap it behind a `CrawlerService` interface so it can be swapped for a direct scraper if the package is unavailable. Confidence: LOW — verify package existence before building on it. |

**Contingency if kbo-game is unavailable:** Use `axios` + `cheerio` to scrape `https://sports.naver.com/kbaseball/` directly, same polling pattern. Structure the `CrawlerService` interface now so the implementation is swappable.

---

### Push Notification

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Toss Push API (스마트 발송) | N/A (REST API, mTLS) | Deliver game-end notifications | PROJECT.md mandates Toss Push API. mTLS required — certificate issued from 앱인토스 console, valid 390 days, rotate before expiry. Endpoint: `https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/messenger/send-message`. Rate limit: 100ms between sends (per PROJECT.md) — implement sequential queue. |
| Node.js `https` / `axios` with mTLS options | built-in / `axios` 1.x | HTTP client with mutual TLS | Pass `cert` + `key` files via `httpsAgent` options. Do NOT store cert files in repo — use environment variable injection at runtime (base64-encoded). |

---

### Background Processing / Polling Worker

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| BullMQ | 5.72.x | Job queue for polling + push dispatch | PROJECT.md requires sequential push dispatch (100ms interval) and a polling worker. BullMQ on Redis provides delayed jobs, retries, concurrency control. Runs as a separate Node.js process — not inside Next.js serverless functions (which time out). |
| Redis (Upstash) | managed | BullMQ backend | Upstash Redis works with BullMQ out of the box (verified via Upstash docs), has free tier, HTTP-based so no persistent connection issues in serverless contexts. Alternative: Railway-hosted Redis for full connection mode. |
| Vercel Cron Jobs | N/A (vercel.json config) | Trigger polling worker health-check / fallback | Vercel Cron available on all plans (2 jobs on Hobby, 40 on Pro). Use as a lightweight heartbeat for the polling worker, not as the primary polling mechanism (Vercel functions have 10s–5min limits depending on plan). |

**Architecture decision:** The polling worker (Playing→Finished detection) MUST run as a persistent long-lived process, not a Vercel serverless function. Deploy as a separate Fly.io or Railway service, or as a Vercel Background Function (if available on plan). Vercel Cron can re-trigger a stateless check, but variable polling intervals (more frequent after 8th inning) are better managed by BullMQ delayed jobs.

---

### Animations

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GSAP | 3.14.2 | Interactive game-result screen animations | PROJECT.md mandates GSAP. Includes ScrollTrigger at no extra cost (`import { ScrollTrigger } from "gsap/ScrollTrigger"`). Ideal for score-reveal, inning timeline, win/loss celebration. Free for most use cases; Club GreenSock license needed for SplitText/premium plugins. |
| Lenis | 1.3.21 | Smooth scroll | PROJECT.md mandates Lenis. Renamed from `@studio-freight/lenis` — use `lenis` package. React wrapper via `@darkroom-engineering/lenis-react` or manual `useEffect` integration. Integrates with GSAP ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`. |

---

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | latest 2.x | Unit + integration tests | TDD mandate in PROJECT.md. Vitest is faster than Jest, native ESM, compatible with TypeScript 5 without additional config. Use for Auth, Crawler, Polling Worker, Push Provider modules. |
| `@testing-library/react` | latest | Component tests | React 19 compatible. Test subscription form and team selector components. |
| `msw` (Mock Service Worker) | 2.x | API mocking in tests | Mock Toss Push API and kbo-game responses in tests without hitting real endpoints. |

---

### Infrastructure / Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | N/A | Next.js hosting | PROJECT.md mandates Vercel. Native Next.js 16 support, Edge Network, automatic preview deployments, Cron Jobs. |
| Supabase (cloud) | N/A | Managed PostgreSQL + Auth | Managed service, free tier sufficient for MVP. |
| Fly.io or Railway | N/A | Persistent polling worker process | BullMQ worker needs persistent Node.js process. Fly.io has free tier with persistent VMs. Railway is simple to deploy from GitHub. Pick one at project start — do not defer this decision. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix, Vite SPA | Next.js is mandated and Toss examples use it. Remix has less ecosystem momentum in 2025. Pure SPA can't handle server-side mTLS push. |
| Queue | BullMQ + Redis | Supabase pg_cron + pg_notify | pg_notify works for simple cases but Supabase free tier cron frequency is limited. BullMQ gives better retry/delay control for variable polling. |
| CSS | Tailwind v4 | CSS Modules, Emotion | Tailwind v4 is the standard for 2025 Next.js projects. CSS Modules require more boilerplate for Toss-style design tokens. Emotion adds runtime JS. |
| Animation | GSAP + Lenis | Framer Motion | PROJECT.md mandates GSAP/Lenis. Framer Motion is React-native but less capable for complex timeline animations and scroll-linked effects. |
| Testing | Vitest | Jest | Vitest is faster and has first-class ESM support. Jest still requires transform config with TypeScript 5. |
| DB client | Supabase JS | Prisma + raw Postgres | Supabase JS bundles Auth + Realtime + DB client. Prisma adds migration overhead for MVP. Can add later for complex queries. |
| Worker hosting | Fly.io / Railway | Vercel Background Functions | Vercel functions have execution time limits. Polling worker needs to run indefinitely and manage its own BullMQ queue. |

---

## Installation

```bash
# Create project
npx create-next-app@latest kbo-game --typescript --tailwind --app --turbopack

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Queue
npm install bullmq ioredis

# Animations
npm install gsap lenis

# HTTP (for mTLS push calls)
npm install axios

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/user-event msw @vitejs/plugin-react jsdom

# shadcn/ui (interactive CLI — run separately)
npx shadcn@latest init
```

---

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Toss mTLS (base64-encoded cert/key files)
TOSS_MTLS_CERT_BASE64=
TOSS_MTLS_KEY_BASE64=
TOSS_APP_ID=

# Redis (Upstash or Railway)
REDIS_URL=

# Cron security
CRON_SECRET=
```

---

## Confidence Assessment

| Component | Confidence | Source |
|-----------|------------|--------|
| Next.js 16 | HIGH | Verified nextjs.org/blog/next-16 (Oct 2025) |
| React 19.2 | HIGH | Bundled with Next.js 16 |
| Tailwind CSS v4 | HIGH | tailwindcss.com/blog/tailwindcss-v4 (Jan 2025) |
| Supabase JS 2.101.x | HIGH | npm registry, 2 days ago |
| BullMQ 5.72.x | HIGH | npm registry, active |
| GSAP 3.14.2 | HIGH | npm registry, 4 months ago |
| Lenis 1.3.21 | HIGH | npm registry, 7 days ago |
| Toss Push API (mTLS) | MEDIUM | developers-apps-in-toss.toss.im (accessible), rate limit 100ms from PROJECT.md |
| kbo-game npm package | LOW | Not found in public npm/GitHub searches — must verify existence before project start |
| Fly.io/Railway worker hosting | MEDIUM | Standard practice for persistent Node.js workers, not Toss-specific |

---

## Sources

- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16)
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Supabase JS npm](https://www.npmjs.com/package/@supabase/supabase-js)
- [BullMQ docs](https://docs.bullmq.io/)
- [GSAP npm](https://www.npmjs.com/package/gsap)
- [Lenis npm](https://www.npmjs.com/package/lenis)
- [Apps in Toss Developer Center](https://developers-apps-in-toss.toss.im/development/integration-process.html)
- [Apps in Toss GitHub Examples](https://github.com/toss/apps-in-toss-examples)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4)
