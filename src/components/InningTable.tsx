'use client'

import { KBO_TEAMS } from '@/types/user'
import type { InningScore } from '@/types/game'

type InningTableProps = {
  innings: InningScore[]
  homeTeam: string
  awayTeam: string
}

const TOTAL_INNINGS = 9

export function InningTable({ innings, homeTeam, awayTeam }: InningTableProps) {
  const homeInfo = KBO_TEAMS.find((t) => t.code === homeTeam)
  const awayInfo = KBO_TEAMS.find((t) => t.code === awayTeam)

  const homeName = homeInfo?.name ?? homeTeam
  const awayName = awayInfo?.name ?? awayTeam

  if (innings.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="py-4 text-center text-sm text-gray-400">이닝 정보가 없습니다</p>
      </div>
    )
  }

  // 이닝 번호 -> 점수 맵
  const inningMap = new Map<number, InningScore>()
  for (const s of innings) {
    inningMap.set(s.inning, s)
  }

  const homeTotal = innings.reduce((sum, s) => sum + s.home, 0)
  const awayTotal = innings.reduce((sum, s) => sum + s.away, 0)

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">팀</th>
              {Array.from({ length: TOTAL_INNINGS }, (_, i) => (
                <th key={i + 1} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  {i + 1}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">R</th>
            </tr>
          </thead>
          <tbody>
            {/* Away 팀 (원정 상단 - KBO 관례) */}
            <tr className="border-t border-gray-100">
              <td className="px-3 py-2 text-xs font-medium text-gray-700">{awayName}</td>
              {Array.from({ length: TOTAL_INNINGS }, (_, i) => {
                const score = inningMap.get(i + 1)
                return (
                  <td key={i + 1} className="px-2 py-2 text-center text-sm text-gray-900">
                    {score != null ? score.away : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900">
                {awayTotal}
              </td>
            </tr>
            {/* Home 팀 (홈 하단 - KBO 관례) */}
            <tr className="border-t border-gray-100">
              <td className="px-3 py-2 text-xs font-medium text-gray-700">{homeName}</td>
              {Array.from({ length: TOTAL_INNINGS }, (_, i) => {
                const score = inningMap.get(i + 1)
                return (
                  <td key={i + 1} className="px-2 py-2 text-center text-sm text-gray-900">
                    {score != null ? score.home : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900">
                {homeTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
