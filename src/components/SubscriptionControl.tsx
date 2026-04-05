'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { KBO_TEAMS } from '@/types/user'
import type { User } from '@/types/user'
import { ConfirmModal } from '@/components/ConfirmModal'

type SubscriptionControlProps = {
  user: User
  onUnsubscribe: () => void
}

/**
 * 구독 관리 컴포넌트
 * - 현재 응원팀 표시 (로고 + 팀명 + "알림 받는 중" 뱃지)
 * - 탭하면 드롭다운: "응원팀 변경", "알림 끄기"
 * - "알림 끄기" -> ConfirmModal -> DELETE /api/subscription
 * - "응원팀 변경" -> /team-select?current=XX
 */
export function SubscriptionControl({ user, onUnsubscribe }: SubscriptionControlProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUnsubModalOpen, setIsUnsubModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const team = KBO_TEAMS.find((t) => t.code === user.team_code)

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  const handleTeamChange = () => {
    setIsMenuOpen(false)
    router.push(`/team-select?current=${user.team_code}`)
  }

  const handleUnsubscribeClick = () => {
    setIsMenuOpen(false)
    setIsUnsubModalOpen(true)
  }

  const handleUnsubscribeConfirm = async () => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/subscription', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('구독 해제에 실패했습니다')
      }

      setIsUnsubModalOpen(false)
      onUnsubscribe()
    } catch {
      setIsUnsubModalOpen(false)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!team) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-colors active:bg-gray-50"
      >
        <div className="flex h-10 w-10 items-center justify-center">
          {imgError ? (
            <span className="text-sm font-bold text-gray-400">
              {team.code}
            </span>
          ) : (
            <Image
              src={team.logo}
              alt={team.name}
              width={40}
              height={40}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-base font-semibold text-gray-900">{team.name}</p>
        </div>
        {user.subscribed && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#0064FF]">
            알림 받는 중
          </span>
        )}
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isMenuOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl bg-white shadow-lg">
          <button
            type="button"
            onClick={handleTeamChange}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            응원팀 변경
          </button>
          <div className="mx-4 border-t border-gray-100" />
          <button
            type="button"
            onClick={handleUnsubscribeClick}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5" />
            </svg>
            알림 끄기
          </button>
        </div>
      )}

      {/* 구독 해제 확인 모달 */}
      <ConfirmModal
        isOpen={isUnsubModalOpen}
        title="알림 해제"
        message="알림을 그만 받을까요?"
        confirmText={isProcessing ? '처리 중...' : '해제하기'}
        cancelText="취소"
        onConfirm={handleUnsubscribeConfirm}
        onCancel={() => setIsUnsubModalOpen(false)}
      />
    </div>
  )
}
