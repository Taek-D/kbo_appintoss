import { describe, it, expect } from 'vitest'
import { KBO_TEAMS } from '@/types/user'
import type { GameStatus } from '@/types/game'
import type { TossReferrer } from '@/types/toss'

describe('프로젝트 설정 검증', () => {
  it('KBO 10개 구단이 정의되어 있다', () => {
    expect(KBO_TEAMS).toHaveLength(10)
  })

  it('모든 팀에 code, name, logo가 있다', () => {
    for (const team of KBO_TEAMS) {
      expect(team.code).toBeTruthy()
      expect(team.name).toBeTruthy()
      expect(team.logo).toMatch(/^\/teams\/\w+\.png$/)
    }
  })

  it('GameStatus 타입이 올바르게 정의된다', () => {
    const status: GameStatus = 'scheduled'
    expect(status).toBe('scheduled')
  })

  it('TossReferrer 타입이 올바르게 정의된다', () => {
    const referrer: TossReferrer = 'sandbox'
    expect(referrer).toBe('sandbox')
  })
})
