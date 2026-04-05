'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { ScoreBoard } from '@/components/ScoreBoard'
import { InningTable } from '@/components/InningTable'
import { parseInningData } from '@/types/game'
import type { Game } from '@/types/game'

type AuthMeResponse = {
  user: {
    team_code: string | null
  }
}

type GameResponse = {
  game: Game
}

export default function GameResultPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null

  const [game, setGame] = useState<Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userTeamCode, setUserTeamCode] = useState<string | null>(null)

  // 경기 데이터 fetch
  useEffect(() => {
    if (!id) {
      router.replace('/')
      return
    }

    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/games/${id}`)

        if (!res.ok) {
          // 404 또는 기타 오류 -> 메인으로 리디렉트 (per D-08)
          router.replace('/')
          return
        }

        const data = await res.json() as GameResponse
        setGame(data.game)
      } catch {
        router.replace('/')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGame()
  }, [id, router])

  // 유저 응원팀 조회 (승패 표현용 — 실패해도 페이지 동작)
  useEffect(() => {
    const fetchUserTeam = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json() as AuthMeResponse
        setUserTeamCode(data.user.team_code)
      } catch {
        // 실패해도 무시 — userTeamCode는 null로 처리
      }
    }

    fetchUserTeam()
  }, [])

  // Lenis smooth scroll 초기화 (결과 화면에만 — per D-05)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      syncTouch: false,
    })

    return () => {
      lenis.destroy()
    }
  }, [])

  // 로딩 상태: 스켈레톤 UI (기존 page.tsx 패턴과 동일)
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 pb-8">
        {/* 네비게이션 스켈레톤 */}
        <div className="sticky top-0 z-10 flex items-center bg-white px-4 py-3 shadow-sm">
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1" />
        </div>

        {/* 스코어보드 스켈레톤 */}
        <div className="px-5 pt-6">
          <div className="animate-pulse">
            <div className="h-40 rounded-2xl bg-gray-100" />
          </div>
        </div>

        {/* 이닝 테이블 스켈레톤 */}
        <div className="mt-4 px-5">
          <div className="animate-pulse">
            <div className="h-24 rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!game) return null

  return (
    <div className="min-h-dvh bg-gray-50 pb-8">
      {/* 상단 네비게이션 바 */}
      <div className="sticky top-0 z-10 flex items-center bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.replace('/')}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-gray-100"
          aria-label="뒤로가기"
        >
          {/* 왼쪽 화살표 SVG */}
          <svg
            className="h-5 w-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900">경기 결과</h1>
        {/* 대칭 맞춤용 spacer */}
        <div className="h-9 w-9" />
      </div>

      {/* 스코어보드 카드 */}
      <div className="px-5 pt-6">
        <ScoreBoard
          homeTeam={game.home_team}
          awayTeam={game.away_team}
          homeScore={game.home_score}
          awayScore={game.away_score}
          userTeamCode={userTeamCode}
        />
      </div>

      {/* 이닝 테이블 카드 */}
      <div className="mt-4 px-5">
        <InningTable
          innings={parseInningData(game.inning_data)}
          homeTeam={game.home_team}
          awayTeam={game.away_team}
        />
      </div>

      {/* 경기 정보 */}
      <div className="mt-4 px-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">{game.game_date} 경기</p>
          {game.finished_at && (
            <p className="mt-1 text-xs text-gray-400">
              종료:{' '}
              {new Date(game.finished_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
