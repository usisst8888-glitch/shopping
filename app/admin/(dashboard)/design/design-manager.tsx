'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteDesign, NavItem } from '@/lib/types/design'
import { upsertDesign } from './actions'

export function DesignManager({
  siteId,
  design,
}: {
  siteId: string
  design: SiteDesign | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // 네비게이션 항목
  const [navItems, setNavItems] = useState<NavItem[]>(
    design?.nav_items ?? [
      { label: '신상품', href: '/' },
      { label: '베스트', href: '/' },
      { label: '브랜드', href: '/' },
      { label: '카테고리', href: '/' },
    ]
  )

  // 브랜드 목록
  const [brandsList, setBrandsList] = useState<string[]>(
    design?.brands_list ?? []
  )
  const [newBrand, setNewBrand] = useState('')

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

  function addBrand() {
    const trimmed = newBrand.trim()
    if (trimmed && !brandsList.includes(trimmed)) {
      setBrandsList([...brandsList, trimmed])
      setNewBrand('')
    }
  }

  function removeBrand(index: number) {
    setBrandsList(brandsList.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    formData.set('nav_items', JSON.stringify(navItems.filter((n) => n.label.trim())))
    formData.set('brands_list', JSON.stringify(brandsList))

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

      {/* 히어로 기본 설정 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          히어로 기본 설정
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          배너가 등록되어 있으면 배너가 우선 표시됩니다.
        </p>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="hero_title"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                제목
              </label>
              <input
                id="hero_title"
                name="hero_title"
                type="text"
                defaultValue={design?.hero_title ?? ''}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="최상급 명품 레플리카"
              />
            </div>
            <div>
              <label
                htmlFor="hero_bg_color"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                배경색
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="hero_bg_color"
                  defaultValue={design?.hero_bg_color ?? '#18181b'}
                  className="h-[42px] w-[42px] cursor-pointer rounded-lg border border-zinc-300"
                />
                <input
                  id="hero_bg_color_text"
                  type="text"
                  defaultValue={design?.hero_bg_color ?? '#18181b'}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  readOnly
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="hero_subtitle"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              부제목
            </label>
            <input
              id="hero_subtitle"
              name="hero_subtitle"
              type="text"
              defaultValue={design?.hero_subtitle ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="합리적인 가격으로 만나는 프리미엄 품질."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="hero_cta_text"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                버튼 텍스트
              </label>
              <input
                id="hero_cta_text"
                name="hero_cta_text"
                type="text"
                defaultValue={design?.hero_cta_text ?? '쇼핑하기'}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="쇼핑하기"
              />
            </div>
            <div>
              <label
                htmlFor="hero_cta_link"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                버튼 링크
              </label>
              <input
                id="hero_cta_link"
                name="hero_cta_link"
                type="text"
                defaultValue={design?.hero_cta_link ?? '/'}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="/"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">네비게이션</h3>
          <button
            type="button"
            onClick={addNavItem}
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
          >
            메뉴 추가
          </button>
        </div>

        <div className="space-y-3">
          {navItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateNavItem(index, 'label', e.target.value)}
                className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="메뉴명"
              />
              <input
                type="text"
                value={item.href}
                onChange={(e) => updateNavItem(index, 'href', e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="/products"
              />
              <button
                type="button"
                onClick={() => removeNavItem(index)}
                className="flex-shrink-0 text-xs text-red-500 hover:underline"
              >
                삭제
              </button>
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
          <div>
            <label
              htmlFor="footer_phone"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              전화번호
            </label>
            <input
              id="footer_phone"
              name="footer_phone"
              type="text"
              defaultValue={design?.footer_phone ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="010-0000-0000"
            />
          </div>
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
        </div>
      </div>

      {/* 브랜드 목록 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          브랜드 목록
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          홈페이지 브랜드 섹션에 표시할 브랜드를 관리합니다.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {brandsList.map((brand, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
            >
              {brand}
              <button
                type="button"
                onClick={() => removeBrand(index)}
                className="ml-1 text-zinc-400 hover:text-red-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addBrand()
              }
            }}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="브랜드명 입력 후 Enter"
          />
          <button
            type="button"
            onClick={addBrand}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
          >
            추가
          </button>
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
