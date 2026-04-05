import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameCard } from '@/components/GameCard'
import type { Game } from '@/types/game'

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'uuid-001',
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
    ...overrides,
  }
}

describe('GameCard', () => {
  it('Test 1: status="finished" -> 최종 스코어 표시 + onClick 호출 가능', () => {
    const handleClick = vi.fn()
    render(
      <GameCard
        game={makeGame({ status: 'finished', home_score: 5, away_score: 3 })}
        isMyTeam={false}
        onClick={handleClick}
      />
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    const card = screen.getByRole('button')
    fireEvent.click(card)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('Test 2: status="playing" -> "경기 중" 뱃지 표시', () => {
    render(
      <GameCard
        game={makeGame({ status: 'playing', home_score: 2, away_score: 1 })}
        isMyTeam={false}
      />
    )
    expect(screen.getByText('경기 중')).toBeInTheDocument()
  })

  it('Test 3: status="scheduled" -> 시작 시간 표시', () => {
    render(
      <GameCard
        game={makeGame({
          status: 'scheduled',
          home_score: 0,
          away_score: 0,
          started_at: '2026-04-05T05:00:00Z',
          finished_at: null,
        })}
        isMyTeam={false}
      />
    )
    // 시작 시간 HH:MM 형식이 있어야 함
    const timeEl = screen.getByText(/\d{2}:\d{2}/)
    expect(timeEl).toBeInTheDocument()
  })

  it('Test 4: status="cancelled" -> "취소" 뱃지 표시', () => {
    render(
      <GameCard
        game={makeGame({ status: 'cancelled', home_score: 0, away_score: 0 })}
        isMyTeam={false}
      />
    )
    expect(screen.getByText('취소')).toBeInTheDocument()
  })
})
