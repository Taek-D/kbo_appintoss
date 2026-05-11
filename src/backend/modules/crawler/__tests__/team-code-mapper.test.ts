import { describe, it, expect } from 'vitest'
import { normalizeTeamCode, normalizeTeamCodeStrict } from '../team-code-mapper'

describe('normalizeTeamCode', () => {
  it('영문 코드는 그대로 반환', () => {
    expect(normalizeTeamCode('KI')).toBe('KI')
    expect(normalizeTeamCode('OB')).toBe('OB')
    expect(normalizeTeamCode('LG')).toBe('LG')
    expect(normalizeTeamCode('HH')).toBe('HH')
  })

  it('한글 약어 → 영문 코드', () => {
    expect(normalizeTeamCode('두산')).toBe('OB')
    expect(normalizeTeamCode('롯데')).toBe('LT')
    expect(normalizeTeamCode('삼성')).toBe('SS')
    expect(normalizeTeamCode('키움')).toBe('WO')
    expect(normalizeTeamCode('한화')).toBe('HH')
  })

  it('영문 약어 (KIA/SSG) → 정규 코드', () => {
    expect(normalizeTeamCode('KIA')).toBe('KI')
    expect(normalizeTeamCode('SSG')).toBe('SK')
  })

  it('한글 풀네임 → 영문 코드', () => {
    expect(normalizeTeamCode('KIA 타이거즈')).toBe('KI')
    expect(normalizeTeamCode('두산 베어스')).toBe('OB')
    expect(normalizeTeamCode('SSG 랜더스')).toBe('SK')
    expect(normalizeTeamCode('한화 이글스')).toBe('HH')
  })

  it('공백 trim 처리', () => {
    expect(normalizeTeamCode(' 두산 ')).toBe('OB')
    expect(normalizeTeamCode('LG\n')).toBe('LG')
  })

  it('매핑 불가능한 입력은 null', () => {
    expect(normalizeTeamCode('알 수 없는팀')).toBeNull()
    expect(normalizeTeamCode('')).toBeNull()
    expect(normalizeTeamCode('XX')).toBeNull()
  })
})

describe('normalizeTeamCodeStrict', () => {
  it('정상 매핑은 그대로 반환', () => {
    expect(normalizeTeamCodeStrict('두산')).toBe('OB')
    expect(normalizeTeamCodeStrict('KI')).toBe('KI')
  })

  it('매핑 불가면 throw', () => {
    expect(() => normalizeTeamCodeStrict('알 수 없는팀')).toThrow(/Unknown team name/)
    expect(() => normalizeTeamCodeStrict('')).toThrow(/Unknown team name/)
  })
})
