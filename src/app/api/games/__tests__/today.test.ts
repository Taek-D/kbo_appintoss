import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Game } from '@/types/game'

// Supabase server mock
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GET } from '../today/route'

// 오늘 날짜(KST) 계산
function getTodayKst(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const mockGame: Game = {
  id: 'uuid-001',
  game_date: getTodayKst(),
  home_team: 'LG',
  away_team: 'KT',
  status: 'finished',
  home_score: 5,
  away_score: 3,
  inning_data: null,
  started_at: '2026-04-05T05:00:00Z',
  finished_at: '2026-04-05T08:00:00Z',
  is_notified_start: true,
  is_notified_finish: true,
  is_notified_cancel: false,
  created_at: '2026-04-05T00:00:00Z',
  updated_at: '2026-04-05T08:00:00Z',
}

function makeSupabaseMock(data: Game[] | null, error: { message: string } | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
  return {
    from: vi.fn().mockReturnValue(chain),
  }
}

describe('GET /api/games/today', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1: 오늘 경기 있으면 200 + { games: Game[] } 반환', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock([mockGame], null)
    )

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json() as { games: Game[] }
    expect(body.games).toHaveLength(1)
    expect(body.games[0].id).toBe('uuid-001')
  })

  it('Test 2: 오늘 경기 없으면 200 + { games: [] } 반환', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock([], null)
    )

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json() as { games: Game[] }
    expect(body.games).toEqual([])
  })

  it('Test 3: DB 에러 시 500 + { error: string } 반환', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(null, { message: 'DB connection failed' })
    )

    const res = await GET()
    expect(res.status).toBe(500)

    const body = await res.json() as { error: string }
    expect(typeof body.error).toBe('string')
  })
})
