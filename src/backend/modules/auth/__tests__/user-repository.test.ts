import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User } from '@/types/user'

// Supabase 클라이언트 모킹
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn()
const mockUpsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        upsert: (...upsertArgs: unknown[]) => {
          mockUpsert(...upsertArgs)
          return {
            select: (...selectArgs: unknown[]) => {
              mockSelect(...selectArgs)
              return {
                single: () => {
                  mockSingle()
                  return mockSingle()
                },
              }
            },
          }
        },
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs)
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs)
              return {
                single: () => mockSingle(),
              }
            },
          }
        },
        update: (...updateArgs: unknown[]) => {
          mockUpdate(...updateArgs)
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs)
              return mockEq()
            },
          }
        },
      }
    },
  }),
}))

// 모듈은 아직 존재하지 않음 - RED 단계
import {
  upsertUser,
  getUserByTossKey,
  updateTeamCode,
  updateSubscription,
} from '../user-repository'

const mockUser: User = {
  id: 'uuid-123',
  toss_user_key: 'toss-key-abc',
  team_code: null,
  subscribed: false,
  created_at: '2026-04-05T00:00:00Z',
  updated_at: '2026-04-05T00:00:00Z',
}

describe('user-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('upsertUser', () => {
    it('신규 userKey로 호출하면 새 유저를 생성한다 (subscribed=false, team_code=null)', async () => {
      mockSingle.mockResolvedValue({ data: mockUser, error: null })

      const result = await upsertUser('toss-key-abc')

      expect(result).toEqual(mockUser)
      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ toss_user_key: 'toss-key-abc' }),
        expect.objectContaining({ onConflict: 'toss_user_key' })
      )
    })

    it('기존 userKey로 호출하면 기존 유저를 반환한다 (중복 생성 안 함) [AUTH-03]', async () => {
      const existingUser: User = { ...mockUser, id: 'uuid-existing' }
      mockSingle.mockResolvedValue({ data: existingUser, error: null })

      const result = await upsertUser('toss-key-abc')

      expect(result).toEqual(existingUser)
      expect(result.id).toBe('uuid-existing')
    })

    it('Supabase 에러 시 에러를 throw한다', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      await expect(upsertUser('toss-key-fail')).rejects.toThrow()
    })
  })

  describe('getUserByTossKey', () => {
    it('존재하는 userKey로 조회하면 User를 반환한다', async () => {
      mockSingle.mockResolvedValue({ data: mockUser, error: null })

      const result = await getUserByTossKey('toss-key-abc')

      expect(result).toEqual(mockUser)
      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockEq).toHaveBeenCalledWith('toss_user_key', 'toss-key-abc')
    })

    it('없는 userKey로 조회하면 null을 반환한다', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      })

      const result = await getUserByTossKey('non-existent-key')

      expect(result).toBeNull()
    })
  })

  describe('updateTeamCode', () => {
    it('유효한 TeamCode로 업데이트하면 team_code 갱신 + subscribed=true [AUTH-02, AUTH-04]', async () => {
      const updatedUser: User = { ...mockUser, team_code: 'LG', subscribed: true }
      mockEq.mockResolvedValue({ data: updatedUser, error: null })

      const result = await updateTeamCode('uuid-123', 'LG')

      expect(result).toEqual(updatedUser)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ team_code: 'LG', subscribed: true })
      )
    })

    it('유효하지 않은 TeamCode로 업데이트하면 에러를 throw한다', async () => {
      await expect(
        updateTeamCode('uuid-123', 'INVALID' as never)
      ).rejects.toThrow()
    })

    it('Supabase 에러 시 에러를 throw한다', async () => {
      mockEq.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      await expect(updateTeamCode('uuid-123', 'KT')).rejects.toThrow()
    })
  })

  describe('updateSubscription', () => {
    it('subscribed=false로 갱신하면 구독이 해제된다 [SUB-01]', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await updateSubscription('uuid-123', false)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ subscribed: false })
      )
      expect(mockEq).toHaveBeenCalledWith('id', 'uuid-123')
    })
  })
})
