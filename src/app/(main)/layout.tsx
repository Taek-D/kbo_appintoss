'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 메인 라우트 그룹 레이아웃
 * - 인증 가드: GET /api/auth/me -> 401이면 /login 리다이렉트
 * - team_code가 null이면 /team-select 리다이렉트
 * - team-select 페이지는 team_code null 허용 (온보딩 플로우)
 */
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')

        if (response.status === 401) {
          router.replace('/login')
          return
        }

        if (!response.ok) {
          router.replace('/login')
          return
        }

        const data: unknown = await response.json()
        const userData = data as {
          user: { team_code: string | null }
        }

        // team_code가 없고 현재 team-select가 아니면 리다이렉트
        if (!userData.user.team_code && !window.location.pathname.includes('/team-select')) {
          router.replace('/team-select')
          return
        }

        setIsReady(true)
      } catch {
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router])

  if (!isReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#0064FF]" />
      </div>
    )
  }

  return <>{children}</>
}
