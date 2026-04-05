import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// vi.hoisted: vi.mock 팩토리보다 먼저 초기화
const { mockGsapFrom, mockUseGSAP } = vi.hoisted(() => ({
  mockGsapFrom: vi.fn(),
  mockUseGSAP: vi.fn((cb: () => void) => cb()),
}))

// gsap default export mock
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    from: mockGsapFrom,
  },
}))

// @gsap/react mock: useGSAP 콜백을 즉시 실행
vi.mock('@gsap/react', () => ({
  useGSAP: mockUseGSAP,
}))

import { ScoreBoard } from '@/components/ScoreBoard'

describe('ScoreBoard', () => {
  beforeEach(() => {
    mockGsapFrom.mockClear()
    mockUseGSAP.mockClear()
    // Re-apply useGSAP implementation so it still calls callback after clearAllMocks
    mockUseGSAP.mockImplementation((cb: () => void) => cb())
  })

  it('Test 1: home_score, away_score 숫자가 렌더링됨', () => {
    render(
      <ScoreBoard
        homeTeam="LG"
        awayTeam="KT"
        homeScore={5}
        awayScore={3}
      />
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('Test 2: 팀 이름이 렌더링됨 (KBO_TEAMS에서 매핑)', () => {
    render(
      <ScoreBoard
        homeTeam="LG"
        awayTeam="KT"
        homeScore={5}
        awayScore={3}
      />
    )
    expect(screen.getByText('LG 트윈스')).toBeInTheDocument()
    expect(screen.getByText('KT 위즈')).toBeInTheDocument()
  })

  it('Test 3: 승리팀(home)에 text-[#0064FF] 클래스 적용', () => {
    const { container } = render(
      <ScoreBoard
        homeTeam="LG"
        awayTeam="KT"
        homeScore={5}
        awayScore={3}
      />
    )
    // home 승리 시 home 스코어 텍스트에 파란색 클래스
    const blueEl = container.querySelector('.text-\\[\\#0064FF\\]')
    expect(blueEl).toBeInTheDocument()
  })

  it('Test 4: gsap.from이 textContent:0 + snap:{textContent:1} 인자로 호출됨', () => {
    render(
      <ScoreBoard
        homeTeam="LG"
        awayTeam="KT"
        homeScore={5}
        awayScore={3}
      />
    )
    // refs are null in jsdom (useGSAP runs before DOM attachment), first arg is null
    expect(mockGsapFrom).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        textContent: 0,
        snap: { textContent: 1 },
      })
    )
  })
})
