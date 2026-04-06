'use client'

import { useCallback, useEffect, useRef } from 'react'

type ConfirmModalProps = {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  // 포커스 관리: 열릴 때 취소 버튼 포커스, 닫힐 때 트리거 복원
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      // requestAnimationFrame으로 DOM 렌더 후 포커스
      const raf = requestAnimationFrame(() => {
        cancelBtnRef.current?.focus()
      })
      return () => cancelAnimationFrame(raf)
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [isOpen])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) {
        onCancel()
      }
    },
    [onCancel]
  )

  // ESC 닫기 + 포커스 트랩
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      // 포커스 트랩
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      style={{ animation: 'modalBackdropIn 200ms ease-out forwards' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        className="mx-5 w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
        style={{ animation: 'modalContentIn 200ms ease-out forwards' }}
      >
        <h3 id="modal-title" className="text-lg font-semibold text-gray-900">{title}</h3>
        <p id="modal-desc" className="mt-2 text-sm text-gray-500">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
