'use client'

import { KBO_TEAMS } from '@/types/user'
import type { Game } from '@/types/game'

type GameCardProps = {
  game: Game
  isMyTeam: boolean
  onClick?: () => void
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '시간 미정'
  const date = new Date(isoString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function GameCard({ game, isMyTeam, onClick }: GameCardProps) {
  const homeInfo = KBO_TEAMS.find((t) => t.code === game.home_team)
  const awayInfo = KBO_TEAMS.find((t) => t.code === game.away_team)
  const homeName = homeInfo?.name ?? game.home_team
  const awayName = awayInfo?.name ?? game.away_team

  const homeWin = game.home_score > game.away_score
  const awayWin = game.away_score > game.home_score

  const isClickable = game.status === 'finished' && typeof onClick === 'function'

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      className={[
        'w-full rounded-xl bg-white p-4 text-left shadow-sm transition-colors',
        isMyTeam ? 'border-l-4 border-[#0064FF]' : '',
        isClickable ? 'cursor-pointer active:bg-gray-50' : 'cursor-default',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 상태 뱃지 */}
      {game.status === 'playing' && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            경기 중
          </span>
        </div>
      )}
      {game.status === 'cancelled' && (
        <div className="mb-2">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
            취소
          </span>
        </div>
      )}

      {/* 팀 및 스코어 */}
      <div className="flex items-center justify-between">
        {/* Away 팀 */}
        <div className="flex flex-1 flex-col items-start">
          <span
            className={`text-sm font-medium ${
              awayWin ? 'font-bold text-gray-900' : 'text-gray-600'
            }`}
          >
            {awayName}
          </span>
        </div>

        {/* 스코어 or 시간 */}
        <div className="flex items-center gap-3 px-3">
          {game.status === 'scheduled' ? (
            <span className="text-sm text-gray-500">{formatTime(game.started_at)}</span>
          ) : game.status === 'cancelled' ? (
            <span className="text-sm text-gray-400">-</span>
          ) : (
            <>
              <span
                className={`text-xl font-bold tabular-nums ${
                  awayWin ? 'text-[#0064FF]' : homeWin ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {game.away_score}
              </span>
              <span className="text-gray-300">:</span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  homeWin ? 'text-[#0064FF]' : awayWin ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {game.home_score}
              </span>
            </>
          )}
        </div>

        {/* Home 팀 */}
        <div className="flex flex-1 flex-col items-end">
          <span
            className={`text-sm font-medium ${
              homeWin ? 'font-bold text-gray-900' : 'text-gray-600'
            }`}
          >
            {homeName}
          </span>
        </div>
      </div>
    </button>
  )
}
