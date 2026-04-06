'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TeamGrid } from '@/components/TeamGrid'
import { ConfirmModal } from '@/components/ConfirmModal'
import { KBO_TEAMS } from '@/types/user'
import type { TeamCode } from '@/types/user'

/**
 * 응원팀 선택 화면
 * - 5x2 그리드로 10개 구단 표시
 * - 팀 탭 시 확인 모달 ("OO팀을 응원할까요?")
 * - 확인 시 PUT /api/subscription 호출 -> 메인으로 이동
 * - 변경 모드: query param ?current=XX로 현재 팀 하이라이트
 */
export default function TeamSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentTeamCode = searchParams.get('current') as TeamCode | null
  const [selectedTeam, setSelectedTeam] = useState<TeamCode | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 변경 모드에서 현재 팀 하이라이트
  const [highlightCode, setHighlightCode] = useState<TeamCode | null>(
    currentTeamCode
  )

  useEffect(() => {
    setHighlightCode(currentTeamCode)
  }, [currentTeamCode])

  const handleTeamSelect = (code: TeamCode) => {
    setSelectedTeam(code)
    setIsModalOpen(true)
    setErrorMessage(null)
  }

  const handleConfirm = async () => {
    if (!selectedTeam) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_code: selectedTeam }),
      })

      if (!response.ok) {
        const data: unknown = await response.json()
        const errorData = data as { error?: string }
        throw new Error(errorData.error ?? '저장에 실패했습니다')
      }

      router.push('/')
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '저장에 실패했습니다'
      setErrorMessage(message)
      setIsModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    setSelectedTeam(null)
  }

  const selectedTeamName =
    KBO_TEAMS.find((t) => t.code === selectedTeam)?.name ?? ''

  return (
    <div className="flex min-h-dvh flex-col bg-white px-5 pt-12 pb-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          {currentTeamCode && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-gray-100"
            >
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">
            응원팀을 선택해주세요
          </h1>
        </div>
        {currentTeamCode && (
          <p className="mt-1 text-sm text-gray-500">
            현재 응원팀을 변경할 수 있어요
          </p>
        )}
      </div>

      <TeamGrid
        onSelect={handleTeamSelect}
        selectedCode={highlightCode ?? selectedTeam}
      />

      {errorMessage && (
        <p className="mt-4 text-center text-sm text-red-500">{errorMessage}</p>
      )}

      <ConfirmModal
        isOpen={isModalOpen}
        title="응원팀 선택"
        message={`${selectedTeamName}을 응원할까요?`}
        confirmText={isSaving ? '저장 중...' : '응원하기'}
        confirmDisabled={isSaving}
        cancelText="취소"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}
