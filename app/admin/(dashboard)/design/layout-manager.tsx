'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import type {
  Banner,
  LayoutSection,
  BannerSectionConfig,
  FeaturedSectionConfig,
} from '@/lib/types/design'
import { saveLayout } from './actions'
import { BannerPickerModal } from './banner-picker-modal'

function generateId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

type CategoryOption = {
  id: string
  name: string
  level: number
  parent_id: string | null
}

export function LayoutManager({
  siteId,
  layout: initialLayout,
  banners,
  categories: allCategories,
}: {
  siteId: string
  layout: LayoutSection[]
  banners: Banner[]
  categories: CategoryOption[]
}) {
  const [sections, setSections] = useState<LayoutSection[]>(initialLayout)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [pickerSection, setPickerSection] =
    useState<BannerSectionConfig | null>(null)
  const [pickerIndex, setPickerIndex] = useState<number>(-1)
  const [showAddMenu, setShowAddMenu] = useState(false)

  // 드래그 상태
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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
      setSections((prev) => {
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

  const toggleVisibility = (idx: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, visible: !s.visible } : s)),
    )
  }

  const deleteSection = (idx: number) => {
    if (!confirm('이 섹션을 삭제하시겠습니까?')) return
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }

  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [editingFeaturedIndex, setEditingFeaturedIndex] = useState<number | null>(null)

  const addSection = (type: LayoutSection['type']) => {
    const id = generateId()
    let newSection: LayoutSection

    if (type === 'banner') {
      newSection = {
        id,
        type: 'banner',
        visible: true,
        label: '새 배너',
        display: 'carousel',
        bannerIds: [],
      }
    } else if (type === 'featured') {
      // 인기상품은 카테고리 선택 모달을 먼저 보여줌
      setShowAddMenu(false)
      setShowCategoryPicker(true)
      return
    } else {
      newSection = { id, type, visible: true } as LayoutSection
    }

    setSections((prev) => [...prev, newSection])
    setShowAddMenu(false)
  }

  const addFeaturedWithCategory = (categoryId: string, categoryName: string) => {
    const id = generateId()
    const newSection: FeaturedSectionConfig = {
      id,
      type: 'featured',
      visible: true,
      categoryId,
      label: categoryName,
    }
    setSections((prev) => [...prev, newSection])
    setShowCategoryPicker(false)
  }

  const updateFeaturedCategory = (idx: number, categoryId: string, categoryName: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, categoryId, label: categoryName } as FeaturedSectionConfig : s
      )
    )
    setEditingFeaturedIndex(null)
  }

  const openBannerPicker = (idx: number) => {
    const section = sections[idx] as BannerSectionConfig
    setPickerSection(section)
    setPickerIndex(idx)
  }

  const handlePickerConfirm = (updated: BannerSectionConfig) => {
    setSections((prev) =>
      prev.map((s, i) => (i === pickerIndex ? updated : s)),
    )
    setPickerSection(null)
    setPickerIndex(-1)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const result = await saveLayout(siteId, sections)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '레이아웃이 저장되었습니다.' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  const bannerMap = new Map(banners.map((b) => [b.id, b]))

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 비주얼 프리뷰 */}
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {/* 브라우저 탑바 */}
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="ml-3 flex-1 rounded-md bg-white px-4 py-1.5 text-xs text-zinc-400">
              https://yoursite.com
            </div>
          </div>

          {/* 헤더 프리뷰 */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
            <span className="text-sm font-bold tracking-wider text-zinc-900">
              LOGO
            </span>
            <div className="flex gap-4">
              {['메뉴1', '메뉴2', '메뉴3', '메뉴4'].map((m) => (
                <span key={m} className="text-xs text-zinc-400">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* 섹션 목록 */}
          <div className="min-h-[200px]">
            {sections.map((section, idx) => {
              const isBanner = section.type === 'banner'
              const bannerCfg = isBanner
                ? (section as BannerSectionConfig)
                : null
              const sectionBanners = bannerCfg
                ? bannerCfg.bannerIds
                    .map((id) => bannerMap.get(id))
                    .filter((b): b is Banner => b != null)
                : []

              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`group relative cursor-grab transition active:cursor-grabbing ${
                    dragOverIndex === idx
                      ? 'ring-2 ring-inset ring-blue-400'
                      : ''
                  } ${dragIndex === idx ? 'opacity-30' : ''} ${
                    !section.visible ? 'opacity-40 grayscale' : ''
                  }`}
                >
                  {/* 호버 시 컨트롤 오버레이 */}
                  <div className="pointer-events-none absolute inset-0 z-10 border-2 border-transparent transition-colors group-hover:border-blue-400">
                    {/* 상단 툴바 */}
                    <div className="pointer-events-auto absolute -top-0.5 left-1/2 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-t-lg bg-blue-500 px-2 py-1 opacity-0 shadow-sm transition group-hover:opacity-100">
                      <span className="cursor-grab text-white" title="드래그하여 이동">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                        </svg>
                      </span>
                      <span className="text-[10px] font-medium text-white">
                        {isBanner
                          ? bannerCfg!.label
                          : section.type === 'categories'
                            ? '카테고리'
                            : section.type === 'featured'
                              ? ((section as FeaturedSectionConfig).label || '인기 상품')
                              : '브랜드'}
                      </span>
                      {isBanner && (
                        <button
                          onClick={() => openBannerPicker(idx)}
                          className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] text-white hover:bg-white/30"
                        >
                          편집
                        </button>
                      )}
                      {section.type === 'featured' && (
                        <button
                          onClick={() => setEditingFeaturedIndex(idx)}
                          className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] text-white hover:bg-white/30"
                        >
                          카테고리 변경
                        </button>
                      )}
                      <button
                        onClick={() => toggleVisibility(idx)}
                        className="rounded bg-white/20 p-0.5 text-white hover:bg-white/30"
                        title={section.visible ? '숨기기' : '표시'}
                      >
                        {section.visible ? (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => deleteSection(idx)}
                        className="rounded bg-white/20 p-0.5 text-white hover:bg-red-400"
                        title="삭제"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 섹션 비주얼 프리뷰 */}
                  <SectionPreview
                    section={section}
                    banners={sectionBanners}
                    bannerCfg={bannerCfg}
                    onBannerEdit={() => openBannerPicker(idx)}
                  />
                </div>
              )
            })}

            {sections.length === 0 && (
              <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
                섹션을 추가하여 레이아웃을 구성하세요
              </div>
            )}
          </div>

          {/* 푸터 프리뷰 */}
          <div className="border-t border-zinc-100 bg-zinc-900 px-6 py-5 text-center">
            <span className="text-xs text-zinc-500">FOOTER</span>
          </div>
        </div>
      </div>

      {/* 섹션 추가 버튼 */}
      <div className="relative flex justify-center">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-5 py-2.5 text-sm text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          섹션 추가
        </button>

        {showAddMenu && (
          <div className="absolute top-full z-20 mt-2 w-52 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => addSection('banner')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              배너
            </button>
            <button
              onClick={() => addSection('categories')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
              </svg>
              카테고리
            </button>
            <button
              onClick={() => addSection('featured')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              인기 상품
            </button>
            <button
              onClick={() => addSection('brands')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              브랜드
            </button>
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '레이아웃 저장'}
        </button>
      </div>

      {/* 배너 선택 모달 */}
      {pickerSection && (
        <BannerPickerModal
          banners={banners}
          section={pickerSection}
          onConfirm={handlePickerConfirm}
          onClose={() => {
            setPickerSection(null)
            setPickerIndex(-1)
          }}
        />
      )}

      {/* 카테고리 선택 모달 (인기상품용) */}
      {(showCategoryPicker || editingFeaturedIndex !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">카테고리 선택</h3>
              <p className="mt-1 text-sm text-zinc-500">인기상품에 표시할 카테고리를 선택하세요</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4">
              <div className="space-y-1">
                {allCategories.filter(c => c.level === 1).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (editingFeaturedIndex !== null) {
                        updateFeaturedCategory(editingFeaturedIndex, cat.id, cat.name)
                      } else {
                        addFeaturedWithCategory(cat.id, cat.name)
                      }
                    }}
                    className="flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-zinc-100 px-6 py-3">
              <button
                onClick={() => {
                  setShowCategoryPicker(false)
                  setEditingFeaturedIndex(null)
                }}
                className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 섹션별 미니 프리뷰 ── */

function SectionPreview({
  section,
  banners,
  bannerCfg,
  onBannerEdit,
}: {
  section: LayoutSection
  banners: Banner[]
  bannerCfg: BannerSectionConfig | null
  onBannerEdit: () => void
}) {
  switch (section.type) {
    case 'banner':
      return (
        <BannerPreview
          banners={banners}
          config={bannerCfg!}
          onEdit={onBannerEdit}
        />
      )
    case 'categories':
      return <CategoriesPreview />
    case 'featured':
      return <FeaturedPreview label={(section as FeaturedSectionConfig).label} />
    case 'brands':
      return <BrandsPreview />
    default:
      return null
  }
}

function BannerPreview({
  banners,
  config,
  onEdit,
}: {
  banners: Banner[]
  config: BannerSectionConfig
  onEdit: () => void
}) {
  if (banners.length === 0) {
    return (
      <div
        className="flex h-52 cursor-pointer items-center justify-center bg-zinc-800"
        onClick={onEdit}
      >
        <div className="text-center">
          <svg
            className="mx-auto mb-2 h-8 w-8 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-zinc-500">클릭하여 배너 선택</p>
        </div>
      </div>
    )
  }

  if (config.display === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-px bg-zinc-200">
        {banners.slice(0, 4).map((b) => (
          <div key={b.id} className="relative aspect-[16/7] overflow-hidden">
            <Image src={b.image_url} alt={b.title || ''} fill className="object-cover" />
          </div>
        ))}
      </div>
    )
  }

  // carousel
  const first = banners[0]
  return (
    <div className="relative h-52 overflow-hidden">
      <Image src={first.image_url} alt={first.title || ''} fill className="object-cover" />
      {(first.title || first.subtitle) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-center text-white">
          {first.title && (
            <p className="text-lg font-bold">{first.title}</p>
          )}
          {first.subtitle && (
            <p className="mt-1 text-xs text-white/70">{first.subtitle}</p>
          )}
        </div>
      )}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${i === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoriesPreview() {
  const cats = [
    { name: '가방', color: 'bg-amber-100' },
    { name: '시계', color: 'bg-slate-100' },
    { name: '지갑', color: 'bg-rose-100' },
    { name: '신발', color: 'bg-emerald-100' },
    { name: '의류', color: 'bg-sky-100' },
    { name: '액세서리', color: 'bg-violet-100' },
  ]

  return (
    <div className="px-8 py-8">
      <p className="mb-4 text-center text-sm font-bold text-zinc-700">
        카테고리
      </p>
      <div className="grid grid-cols-6 gap-3">
        {cats.map((c) => (
          <div
            key={c.name}
            className={`flex h-14 items-center justify-center rounded-lg ${c.color}`}
          >
            <span className="text-xs font-medium text-zinc-600">
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturedPreview({ label }: { label?: string }) {
  return (
    <div className="bg-zinc-50 px-8 py-8">
      <p className="mb-4 text-center text-sm font-bold text-zinc-700">
        {label || '인기 상품'}
      </p>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex h-20 items-center justify-center bg-zinc-100">
              <span className="text-[10px] text-zinc-300">IMG</span>
            </div>
            <div className="space-y-1 px-3 py-2">
              <div className="h-1.5 w-10 rounded-full bg-zinc-200" />
              <div className="h-1.5 w-16 rounded-full bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BrandsPreview() {
  const brands = ['GUCCI', 'LOUIS VUITTON', 'CHANEL', 'HERMES', 'DIOR', 'PRADA']

  return (
    <div className="px-8 py-8">
      <p className="mb-4 text-center text-sm font-bold text-zinc-700">
        취급 브랜드
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {brands.map((b) => (
          <span key={b} className="text-xs font-medium tracking-wider text-zinc-400">
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}
