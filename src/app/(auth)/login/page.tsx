'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { callAppLogin } from '@/lib/toss-sdk'

/**
 * 토스 로그인 화면
 * - 토스 로그인 버튼 + 한 줄 설명 (비주얼/일러스트 없음)
 * - 개발 환경에서는 mock authCode로 로그인
 */
export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      // callAppLogin: 개발 환경 mock / 프로덕션 토스 SDK 분기 처리
      const { authorizationCode, referrer } = await callAppLogin()

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode, referrer }),
      })

      if (!response.ok) {
        const data: unknown = await response.json()
        const errorData = data as { error?: string }
        throw new Error(errorData.error ?? '로그인에 실패했습니다')
      }

      const data: unknown = await response.json()
      const loginData = data as {
        user: { team_code: string | null }
      }

      // team_code가 있으면 메인, 없으면 팀 선택으로 이동
      if (loginData.user.team_code) {
        router.push('/')
      } else {
        router.push('/team-select')
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '로그인에 실패했습니다'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-5">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">KBO 야구 알리미</h1>
        <p className="text-sm text-gray-500">
          응원팀 경기 결과를 바로 알려드려요
        </p>
      </div>

      <div className="mt-10 w-full max-w-sm">
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full rounded-xl bg-[#0064FF] py-3.5 text-base font-semibold text-white transition-colors disabled:opacity-50 active:bg-[#0050CC]"
        >
          {isLoading ? '로그인 중...' : '토스로 시작하기'}
        </button>

        {errorMessage && (
          <p className="mt-3 text-center text-sm text-red-500">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
