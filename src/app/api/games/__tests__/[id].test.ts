import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Game } from '@/types/game'

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
import { GET } from '../[id]/route'

const validUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

const mockGame: Game = {
  id: validUUID,
  game_date: '2026-04-05',
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

function makeSupabaseMock(data: Game | null, error: { message: string; code?: string } | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  return {
    from: vi.fn().mockReturnValue(chain),
  }
}

function makeRequest(id: string): Request {
  return new Request(`https://app.vercel.app/api/games/${id}`)
}

describe('GET /api/games/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1: 유효 UUID id -> 200 + { game: Game } 반환', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(mockGame, null)
    )

    const req = makeRequest(validUUID)
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) })

    expect(res.status).toBe(200)
    const body = await res.json() as { game: Game }
    expect(body.game.id).toBe(validUUID)
  })

  it('Test 2: DB에 없는 id -> 404 + { error: "Not found" } 반환', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(null, { message: 'No rows returned', code: 'PGRST116' })
    )

    const req = makeRequest(validUUID)
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) })

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Not found')
  })

  it('Test 3: UUID 형식이 아닌 id -> 400 + { error: "Invalid game ID" } 반환', async () => {
    const req = makeRequest('not-a-uuid')
    const res = await GET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Invalid game ID')
    // DB 조회 없이 early return
    expect(createServerSupabaseClient).not.toHaveBeenCalled()
  })
})
