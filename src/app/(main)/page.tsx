'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SubscriptionControl } from '@/components/SubscriptionControl'
import { GameCard } from '@/components/GameCard'
import { KBO_TEAMS } from '@/types/user'
import type { User } from '@/types/user'
import type { Game } from '@/types/game'

/**
 * 메인 화면
 * - 현재 응원팀 표시 (SubscriptionControl)
 * - 오늘 경기 목록 (GameCard + 응원팀 강조 + 종료 경기 탭 시 결과 화면 이동)
 * - 에러/로딩 상태 처리
 */
export default function MainPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [isGamesLoading, setIsGamesLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/me')

      if (response.status === 401) {
        router.replace('/login')
        return
      }

      if (!response.ok) {
        throw new Error('정보를 불러올 수 없습니다')
      }

      const data: unknown = await response.json()
      const userData = data as { user: User }
      setUser(userData.user)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '정보를 불러올 수 없습니다'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const fetchGames = useCallback(async () => {
    setIsGamesLoading(true)
    try {
      const response = await fetch('/api/games/today')
      if (response.ok) {
        const data: unknown = await response.json()
        const gamesData = data as { games: Game[] }
        setGames(gamesData.games ?? [])
      }
    } catch {
      setGames([])
    } finally {
      setIsGamesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  const handleUnsubscribe = () => {
    // 구독 해제 후 유저 정보 새로고침
    fetchUser()
  }

  // 로딩 상태: 스켈레톤 UI
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white px-5 pt-12 pb-8">
        <div className="animate-pulse">
          <div className="h-16 rounded-2xl bg-gray-100" />
          <div className="mt-6 h-48 rounded-2xl bg-gray-100" />
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-5">
        <p className="text-sm text-gray-500">{error}</p>
        <button
          type="button"
          onClick={fetchUser}
          className="mt-4 rounded-xl bg-[#0064FF] px-6 py-2.5 text-sm font-medium text-white transition-colors active:bg-[#0050CC]"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!user) return null

  const teamName =
    KBO_TEAMS.find((t) => t.code === user.team_code)?.name ?? '응원팀'

  return (
    <div className="min-h-dvh bg-white px-5 pt-12 pb-8">
      {/* 상단: 구독 관리 */}
      {user.team_code && user.subscribed && (
        <SubscriptionControl user={user} onUnsubscribe={handleUnsubscribe} />
      )}

      {/* 구독 해제된 상태 */}
      {user.team_code && !user.subscribed && (
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">
            알림이 꺼져 있어요.{' '}
            <button
              type="button"
              onClick={() => router.push(`/team-select?current=${user.team_code}`)}
              className="font-medium text-[#0064FF]"
            >
              다시 켜기
            </button>
          </p>
        </div>
      )}

      {/* 응원팀이 없는 상태 (온보딩 미완료) */}
      {!user.team_code && (
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">
            아직 응원팀을 선택하지 않았어요.{' '}
            <button
              type="button"
              onClick={() => router.push('/team-select')}
              className="font-medium text-[#0064FF]"
            >
              선택하기
            </button>
          </p>
        </div>
      )}

      {/* 하단: 오늘 경기 정보 */}
      <div className="mt-6">
        {isGamesLoading ? (
          /* 경기 목록 스켈레톤 */
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded-xl bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
          </div>
        ) : games.length === 0 ? (
          /* 경기 없는 날 — 기존 UI 유지 (per D-07) */
          <div className="rounded-2xl bg-gray-50 p-6">
            <div className="flex flex-col items-center gap-3 py-8">
              <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="24" cy="24" r="20" />
                <path d="M16 8c2 4 2 8 0 12s-2 8 0 12" strokeLinecap="round" />
                <path d="M32 8c-2 4-2 8 0 12s2 8 0 12" strokeLinecap="round" />
              </svg>
              <p className="text-base font-medium text-gray-500">
                오늘은 {teamName} 경기가 없어요
              </p>
              <p className="text-xs text-gray-400">
                경기가 있는 날 알림을 보내드릴게요
              </p>
            </div>
          </div>
        ) : (
          /* 경기 목록 */
          <div className="space-y-3">
            {/* 응원팀 경기 (상단 강조) */}
            {(() => {
              const myTeamGames = games.filter(
                (g) => g.home_team === user.team_code || g.away_team === user.team_code
              )
              const otherGames = games.filter(
                (g) => g.home_team !== user.team_code && g.away_team !== user.team_code
              )
              return (
                <>
                  {myTeamGames.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-[#0064FF]">내 팀 경기</p>
                      <div className="space-y-2">
                        {myTeamGames.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            isMyTeam={true}
                            onClick={game.status === 'finished' ? () => router.push(`/game/${game.id}`) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {otherGames.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-400">
                        {myTeamGames.length > 0 ? '다른 경기' : '오늘의 경기'}
                      </p>
                      <div className="space-y-2">
                        {otherGames.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            isMyTeam={false}
                            onClick={game.status === 'finished' ? () => router.push(`/game/${game.id}`) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
