import type { TeamWidget } from '@/types/season'

/**
 * F014: 응원팀 시즌 위젯 in-memory 캐시 (PRD-014 §6.2).
 * Vercel serverless 인스턴스 단위로 동작 — 5분 TTL.
 */

type CacheEntry = { value: TeamWidget; expiresAt: number }
const TTL_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

export function getCachedWidget(teamCode: string): TeamWidget | null {
  const entry = cache.get(teamCode)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(teamCode)
    return null
  }
  return entry.value
}

export function setCachedWidget(teamCode: string, value: TeamWidget): void {
  cache.set(teamCode, { value, expiresAt: Date.now() + TTL_MS })
}

export function clearWidgetCache(): void {
  cache.clear()
}
