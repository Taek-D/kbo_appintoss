import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InningTable } from '@/components/InningTable'
import type { InningScore } from '@/types/game'

const fullInnings: InningScore[] = [
  { inning: 1, home: 2, away: 0 },
  { inning: 2, home: 0, away: 1 },
  { inning: 3, home: 1, away: 0 },
  { inning: 4, home: 0, away: 0 },
  { inning: 5, home: 0, away: 2 },
  { inning: 6, home: 1, away: 0 },
  { inning: 7, home: 0, away: 0 },
  { inning: 8, home: 1, away: 0 },
  { inning: 9, home: 0, away: 0 },
]

describe('InningTable', () => {
  it('Test 1: InningScore[] 전달 시 1~9회 + R(합계) 렌더링', () => {
    render(
      <InningTable
        innings={fullInnings}
        homeTeam="LG"
        awayTeam="KT"
      />
    )
    // 헤더에 1~9 + R 표시
    for (let i = 1; i <= 9; i++) {
      expect(screen.getAllByText(String(i)).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('R')).toBeInTheDocument()
  })

  it('Test 2: 빈 배열([]) 전달 시 "이닝 정보가 없습니다" 메시지 표시', () => {
    render(
      <InningTable
        innings={[]}
        homeTeam="LG"
        awayTeam="KT"
      />
    )
    expect(screen.getByText('이닝 정보가 없습니다')).toBeInTheDocument()
  })

  it('Test 3: 9회 미만 데이터 시 나머지 셀은 "-" 표시', () => {
    const partialInnings: InningScore[] = [
      { inning: 1, home: 1, away: 0 },
      { inning: 2, home: 0, away: 1 },
    ]
    render(
      <InningTable
        innings={partialInnings}
        homeTeam="LG"
        awayTeam="KT"
      />
    )
    // 3~9회 데이터 없으므로 "-" 셀들이 존재해야 함 (7회 * 2팀 = 14개)
    const dashCells = screen.getAllByText('-')
    expect(dashCells.length).toBeGreaterThan(0)
  })
})
