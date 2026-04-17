'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import type { Banner, BannerSectionConfig } from '@/lib/types/design'

export function BannerPickerModal({
  banners,
  section,
  onConfirm,
  onClose,
}: {
  banners: Banner[]
  section: BannerSectionConfig
  onConfirm: (updated: BannerSectionConfig) => void
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(section.bannerIds)
  const [display, setDisplay] = useState<'carousel' | 'grid'>(section.display)
  const [label, setLabel] = useState(section.label)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const activeBanners = banners.filter((b) => b.is_active)

  const toggleBanner = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleDragStart = useCallback((idx: number) => {
    setDragIndex(idx)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === idx) return
      setDragOverIndex(idx)
    },
    [dragIndex],
  )

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIndex === null || dragIndex === idx) return
      setSelectedIds((prev) => {
        const next = [...prev]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(idx, 0, moved)
        return next
      })
      setDragIndex(null)
      setDragOverIndex(null)
    },
    [dragIndex],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  const selectedBanners = selectedIds
    .map((id) => banners.find((b) => b.id === id))
    .filter((b): b is Banner => b != null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-zinc-900">배너 선택</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
          {/* 라벨 & 표시 모드 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                섹션 라벨
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="예: 히어로 배너"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                표시 모드
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDisplay('carousel')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    display === 'carousel'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  캐러셀
                </button>
                <button
                  onClick={() => setDisplay('grid')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    display === 'grid'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  그리드
                </button>
              </div>
            </div>
          </div>

          {/* 선택된 배너 (순서 변경 가능) */}
          {selectedBanners.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                선택된 배너 ({selectedBanners.length}개) - 드래그로 순서 변경
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedBanners.map((banner, idx) => (
                  <div
                    key={banner.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex-shrink-0 cursor-grab rounded-lg border-2 transition ${
                      dragOverIndex === idx
                        ? 'border-zinc-900'
                        : 'border-zinc-200'
                    } ${dragIndex === idx ? 'opacity-30' : ''}`}
                  >
                    <div className="relative h-16 w-28 overflow-hidden rounded-md">
                      <Image
                        src={banner.image_url}
                        alt={banner.title || '배너'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => toggleBanner(banner.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    >
                      x
                    </button>
                    <div className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 전체 배너 목록 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              등록된 배너 (클릭하여 선택/해제)
            </label>
            {activeBanners.length === 0 ? (
              <p className="rounded-lg bg-zinc-50 p-8 text-center text-sm text-zinc-400">
                등록된 배너가 없습니다. 배너 관리 탭에서 먼저 배너를 등록해주세요.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {activeBanners.map((banner) => {
                  const isSelected = selectedIds.includes(banner.id)
                  return (
                    <button
                      key={banner.id}
                      onClick={() => toggleBanner(banner.id)}
                      className={`overflow-hidden rounded-xl border-2 text-left transition ${
                        isSelected
                          ? 'border-zinc-900 ring-1 ring-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="relative aspect-[16/6] w-full overflow-hidden bg-zinc-100">
                        <Image
                          src={banner.image_url}
                          alt={banner.title || '배너'}
                          fill
                          className="object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg
                              className="h-8 w-8 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <p className="truncate text-xs font-medium text-zinc-700">
                          {banner.title || '제목 없음'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            취소
          </button>
          <button
            onClick={() =>
              onConfirm({
                ...section,
                label: label.trim() || '배너',
                display,
                bannerIds: selectedIds,
              })
            }
            className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
