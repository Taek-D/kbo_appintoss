'use client'

import { useState } from 'react'
import Image from 'next/image'
import { KBO_TEAMS } from '@/types/user'
import type { TeamCode } from '@/types/user'

type TeamGridProps = {
  onSelect: (code: TeamCode) => void
  selectedCode?: TeamCode | null
}

export function TeamGrid({ onSelect, selectedCode }: TeamGridProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

  const handleImageError = (code: string) => {
    setImgErrors((prev) => ({ ...prev, [code]: true }))
  }

  return (
    <div className="grid grid-cols-5 grid-rows-2 gap-3">
      {KBO_TEAMS.map((team) => {
        const isSelected = selectedCode === team.code
        const hasImgError = imgErrors[team.code]

        return (
          <button
            key={team.code}
            type="button"
            onClick={() => onSelect(team.code)}
            className={`flex flex-col items-center gap-2 rounded-xl p-3 shadow-sm transition-all active:scale-95 ${
              isSelected
                ? 'border-2 border-[#0064FF] bg-blue-50'
                : 'border border-gray-100 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="relative flex h-12 w-12 items-center justify-center">
              {hasImgError ? (
                <span className="text-xs font-bold text-gray-400">
                  {team.code}
                </span>
              ) : (
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={48}
                  height={48}
                  className="object-contain"
                  onError={() => handleImageError(team.code)}
                />
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                isSelected ? 'text-[#0064FF]' : 'text-gray-700'
              }`}
            >
              {team.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
