'use client'

import { useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { KBO_TEAMS } from '@/types/user'

gsap.registerPlugin(useGSAP)

type ScoreBoardProps = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  userTeamCode?: string | null
}

export function ScoreBoard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  userTeamCode,
}: ScoreBoardProps) {
  const homeRef = useRef<HTMLSpanElement>(null)
  const awayRef = useRef<HTMLSpanElement>(null)

  const homeInfo = KBO_TEAMS.find((t) => t.code === homeTeam)
  const awayInfo = KBO_TEAMS.find((t) => t.code === awayTeam)

  const homeWin = homeScore > awayScore
  const awayWin = awayScore > homeScore

  const isUserWin =
    userTeamCode != null &&
    ((userTeamCode === homeTeam && homeWin) ||
      (userTeamCode === awayTeam && awayWin))

  useGSAP(() => {
    const prefersReduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    gsap.from(homeRef.current, {
      textContent: 0,
      duration: 1.2,
      ease: 'power2.out',
      snap: { textContent: 1 },
      delay: 0.3,
    })
    gsap.from(awayRef.current, {
      textContent: 0,
      duration: 1.2,
      ease: 'power2.out',
      snap: { textContent: 1 },
      delay: 0.3,
    })
  })

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* 승리 축하 배너 */}
      {isUserWin && (
        <div className="bg-gradient-to-r from-[--accent] to-[--accent-hover] px-4 py-2 text-center">
          <span className="text-sm font-semibold text-white">승리!</span>
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-8">
        {/* Away 팀 */}
        <div className="flex flex-1 flex-col items-center gap-2">
          {awayInfo?.logo ? (
            <Image
              src={awayInfo.logo}
              alt={awayInfo.name ?? awayTeam}
              width={48}
              height={48}
              className="object-contain"
              onError={() => {}}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <span className="text-xs font-bold text-gray-500">{awayTeam}</span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">
            {awayInfo?.name ?? awayTeam}
          </span>
        </div>

        {/* 스코어 */}
        <div className="flex items-center gap-4 px-4">
          <span
            ref={awayRef}
            className={`text-5xl font-bold tabular-nums ${
              awayWin
                ? 'text-[--accent]'
                : homeWin
                  ? 'text-gray-400'
                  : 'text-gray-900'
            }`}
          >
            {awayScore}
          </span>
          <span className="text-2xl font-light text-gray-300">:</span>
          <span
            ref={homeRef}
            className={`text-5xl font-bold tabular-nums ${
              homeWin
                ? 'text-[--accent]'
                : awayWin
                  ? 'text-gray-400'
                  : 'text-gray-900'
            }`}
          >
            {homeScore}
          </span>
        </div>

        {/* Home 팀 */}
        <div className="flex flex-1 flex-col items-center gap-2">
          {homeInfo?.logo ? (
            <Image
              src={homeInfo.logo}
              alt={homeInfo.name ?? homeTeam}
              width={48}
              height={48}
              className="object-contain"
              onError={() => {}}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <span className="text-xs font-bold text-gray-500">{homeTeam}</span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">
            {homeInfo?.name ?? homeTeam}
          </span>
        </div>
      </div>
    </div>
  )
}
