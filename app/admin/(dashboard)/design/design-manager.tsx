'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteDesign, NavItem } from '@/lib/types/design'
import { upsertDesign } from './actions'
import { TiptapEditor } from '@/components/admin/tiptap-editor'

type CategoryOption = {
  id: string
  name: string
  level: number
  parent_id: string | null
}

type BoardOption = {
  id: string
  name: string
  slug: string
}

export function DesignManager({
  siteId,
  design,
  categories,
  boards,
}: {
  siteId: string
  design: SiteDesign | null
  categories: CategoryOption[]
  boards: BoardOption[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // 로고
  const [logoPreview, setLogoPreview] = useState<string | null>(design?.logo_url ?? null)
  const [removeLogo, setRemoveLogo] = useState(false)

  // 메인 카테고리 선택
  const [displayCategoryIds, setDisplayCategoryIds] = useState<string[]>(
    design?.display_category_ids ?? []
  )
  // 인기상품 카테고리
  const [featuredCategoryId, setFeaturedCategoryId] = useState<string>(
    design?.featured_category_id ?? ''
  )

  const level1Categories = categories.filter((c) => c.level === 1)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoPreview(URL.createObjectURL(file))
      setRemoveLogo(false)
    }
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    setRemoveLogo(true)
    const input = document.getElementById('logo_image') as HTMLInputElement
    if (input) input.value = ''
  }

  // 푸터 추가사항 (리치 텍스트)
  const [footerExtra, setFooterExtra] = useState<string>(design?.footer_extra ?? '')

  // 네비게이션 항목
  const [navItems, setNavItems] = useState<NavItem[]>(
    design?.nav_items ?? [
      { label: '신상품', href: '/' },
      { label: '베스트', href: '/' },
      { label: '브랜드', href: '/' },
      { label: '카테고리', href: '/' },
    ]
  )

  // 네비게이션 드래그 앤 드롭
  const [navDragIndex, setNavDragIndex] = useState<number | null>(null)

  function handleNavDrop(targetIndex: number) {
    if (navDragIndex === null || navDragIndex === targetIndex) return
    setNavItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(navDragIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setNavDragIndex(null)
  }

  function addNavItem() {
    setNavItems([...navItems, { label: '', href: '/' }])
  }

  function removeNavItem(index: number) {
    setNavItems(navItems.filter((_, i) => i !== index))
  }

  function updateNavItem(index: number, field: keyof NavItem, value: string) {
    const updated = [...navItems]
    updated[index] = { ...updated[index], [field]: value }
    setNavItems(updated)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    formData.set('nav_items', JSON.stringify(navItems.filter((n) => n.label.trim())))
    formData.set('display_category_ids', JSON.stringify(displayCategoryIds))
    formData.set('featured_category_id', featuredCategoryId)
    formData.set('footer_extra', footerExtra)
    if (removeLogo) formData.set('remove_logo', 'true')

    const result = await upsertDesign(siteId, formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          디자인 설정이 저장되었습니다.
        </div>
      )}

      {/* 로고 설정 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">로고 설정</h3>
        <p className="mb-4 text-sm text-zinc-500">
          로고 이미지를 등록하면 헤더에 사이트명 대신 로고가 표시됩니다.
        </p>

        <div className="flex items-start gap-6">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="로고 미리보기"
                className="h-16 w-auto max-w-[200px] rounded-lg border border-zinc-200 object-contain p-2"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="flex h-16 w-[200px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-400">
              로고 없음
            </div>
          )}

          <div>
            <label
              htmlFor="logo_image"
              className="inline-block cursor-pointer rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
            >
              {logoPreview ? '로고 변경' : '로고 업로드'}
            </label>
            <input
              id="logo_image"
              name="logo_image"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="mt-1 text-xs text-zinc-400">PNG, SVG 권장 (투명 배경)</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">네비게이션 메뉴</h3>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                const val = e.target.value
                if (!val) return
                if (val.startsWith('cat:')) {
                  const cat = categories.find((c) => c.id === val.slice(4))
                  if (cat) {
                    const subs = categories.filter((c) => c.parent_id === cat.id)
                    setNavItems([...navItems, {
                      label: cat.name,
                      href: `/category/${cat.id}`,
                      children: subs.length > 0 ? subs.map((s) => {
                        const thirds = categories.filter((c) => c.parent_id === s.id)
                        return {
                          label: s.name,
                          href: `/category/${s.id}`,
                          children: thirds.length > 0 ? thirds.map((t) => ({ label: t.name, href: `/category/${t.id}` })) : undefined,
                        }
                      }) : undefined,
                    }])
                  }
                } else if (val.startsWith('board:')) {
                  const board = boards.find((b) => b.id === val.slice(6))
                  if (board) setNavItems([...navItems, { label: board.name, href: `/board/${board.slug}` }])
                }
                e.target.value = ''
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700"
            >
              <option value="">카테고리/게시판 추가</option>
              <optgroup label="카테고리">
                {categories.filter((c) => c.level === 1).map((cat) => (
                  <option key={cat.id} value={`cat:${cat.id}`}>{cat.name}</option>
                ))}
              </optgroup>
              <optgroup label="게시판">
                {boards.map((board) => (
                  <option key={board.id} value={`board:${board.id}`}>{board.name}</option>
                ))}
              </optgroup>
            </select>
            <button
              type="button"
              onClick={addNavItem}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            >
              직접 추가
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {navItems.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => setNavDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleNavDrop(index)}
              onDragEnd={() => setNavDragIndex(null)}
              className={`rounded-lg border p-3 transition ${
                navDragIndex === index ? 'border-blue-400 opacity-50' : 'border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="cursor-grab text-zinc-400 active:cursor-grabbing">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateNavItem(index, 'label', e.target.value)}
                  className="w-36 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="메뉴명"
                />
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => updateNavItem(index, 'href', e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="/category/신발 또는 /board/notice"
                />
                {item.children && (
                  <span className="text-[10px] text-zinc-400">{item.children.length}개 하위</span>
                )}
                <button
                  type="button"
                  onClick={() => removeNavItem(index)}
                  className="flex-shrink-0 text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
              {item.children && item.children.length > 0 && (
                <div className="ml-44 mt-1 flex flex-wrap gap-1">
                  {item.children.map((child, ci) => (
                    <span key={ci} className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">{child.label}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {navItems.length === 0 && (
            <p className="text-sm text-zinc-400">네비게이션 메뉴가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 푸터 정보 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">푸터 정보</h3>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="footer_hours"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                운영시간
              </label>
              <input
                id="footer_hours"
                name="footer_hours"
                type="text"
                defaultValue={design?.footer_hours ?? ''}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="평일 10:00 - 18:00"
              />
            </div>
            <div>
              <label
                htmlFor="footer_lunch"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                점심시간
              </label>
              <input
                id="footer_lunch"
                name="footer_lunch"
                type="text"
                defaultValue={design?.footer_lunch ?? ''}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="12:00 - 13:00"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              추가사항
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              폰트 크기, 색상, 정렬 등 자유롭게 편집할 수 있습니다.
            </p>
            <TiptapEditor
              content={footerExtra}
              onChange={setFooterExtra}
              minHeight="180px"
            />
          </div>
        </div>
      </div>

      {/* 플로팅 상담 버튼 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">플로팅 상담 버튼</h3>
        <p className="mb-4 text-sm text-zinc-500">
          화면 우측 하단에 고정되는 카카오톡 상담 버튼의 링크를 설정합니다. 비워두면 임시 링크가 사용됩니다.
        </p>
        <div>
          <label
            htmlFor="kakao_link"
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            카카오톡 상담 링크
          </label>
          <input
            id="kakao_link"
            name="kakao_link"
            type="text"
            defaultValue={design?.kakao_link ?? ''}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="https://pf.kakao.com/_xxxxx"
          />
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </form>
  )
}
