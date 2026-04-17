'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Banner } from '@/lib/types/design'
import {
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
} from './actions'

type Mode = 'list' | 'create' | 'edit'

export function BannerManager({
  banners,
  siteId,
}: {
  banners: Banner[]
  siteId: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('list')
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pcPreview, setPcPreview] = useState<string | null>(null)
  const [mobilePreview, setMobilePreview] = useState<string | null>(null)
  const pcInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  function handleCreate() {
    setMode('create')
    setEditingBanner(null)
    setPcPreview(null)
    setMobilePreview(null)
    setError(null)
  }

  function handleEdit(banner: Banner) {
    setMode('edit')
    setEditingBanner(banner)
    setPcPreview(banner.image_url)
    setMobilePreview(banner.mobile_image_url)
    setError(null)
  }

  function handleCancel() {
    setMode('list')
    setEditingBanner(null)
    setPcPreview(null)
    setMobilePreview(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('site_id', siteId)

    const result =
      mode === 'edit' && editingBanner
        ? await updateBanner(editingBanner.id, formData)
        : await createBanner(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setMode('list')
      setEditingBanner(null)
      setPcPreview(null)
      setMobilePreview(null)
      setLoading(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return
    const result = await deleteBanner(id)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  async function handleToggle(id: string, currentActive: boolean) {
    const result = await toggleBannerActive(id, !currentActive)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        배너를 등록하고 관리하세요. 레이아웃 탭에서 등록된 배너를 원하는 위치에
        배치할 수 있습니다.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 배너 목록 */}
      {mode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900">
              배너 라이브러리
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({banners.length}개)
              </span>
            </h3>
            <button
              onClick={handleCreate}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              배너 추가
            </button>
          </div>

          {banners.length === 0 ? (
            <div className="rounded-xl bg-white py-16 text-center shadow-sm">
              <p className="text-zinc-400">등록된 배너가 없습니다.</p>
              <button
                onClick={handleCreate}
                className="mt-4 text-sm font-medium text-zinc-900 underline hover:no-underline"
              >
                첫 배너 추가하기
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className={`overflow-hidden rounded-xl bg-white shadow-sm transition ${
                    !banner.is_active ? 'opacity-50' : ''
                  }`}
                >
                  {/* 이미지 */}
                  <div className="relative aspect-[16/6] bg-zinc-100">
                    <Image
                      src={banner.image_url}
                      alt={banner.title ?? '배너'}
                      fill
                      className="object-cover"
                    />
                    {banner.mobile_image_url && (
                      <div className="absolute bottom-2 right-2 flex h-10 w-7 items-center justify-center overflow-hidden rounded border border-white/50 bg-black/30">
                        <Image
                          src={banner.mobile_image_url}
                          alt="모바일"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    {!banner.is_active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">
                          비활성
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-4">
                    <p className="truncate font-medium text-zinc-900">
                      {banner.title || '(제목 없음)'}
                    </p>
                    {banner.subtitle && (
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.link_url && (
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {banner.link_url}
                      </p>
                    )}

                    {/* 액션 */}
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() =>
                          handleToggle(banner.id, banner.is_active)
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                          banner.is_active ? 'bg-zinc-900' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition ${
                            banner.is_active
                              ? 'translate-x-4.5'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 배너 추가/수정 폼 */}
      {mode !== 'list' && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-zinc-900">
            {mode === 'create' ? '배너 추가' : '배너 수정'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PC / 모바일 이미지 */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* PC 이미지 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  PC 이미지{' '}
                  {mode === 'create' && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <div
                  onClick={() => pcInputRef.current?.click()}
                  className="cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 transition hover:border-zinc-400"
                >
                  {pcPreview ? (
                    <div className="relative aspect-[16/5]">
                      <Image
                        src={pcPreview}
                        alt="PC 미리보기"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                        <span className="text-sm font-medium text-white">
                          이미지 변경
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-[16/5] flex-col items-center justify-center text-zinc-400">
                      <svg
                        className="mb-2 h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
                        />
                      </svg>
                      <span className="text-sm">PC 이미지 업로드</span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  권장: 1920 x 600px
                </p>
                <input
                  ref={pcInputRef}
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setPcPreview(URL.createObjectURL(f))
                  }}
                  className="hidden"
                />
              </div>

              {/* 모바일 이미지 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  모바일 이미지{' '}
                  <span className="text-zinc-400">(선택)</span>
                </label>
                <div
                  onClick={() => mobileInputRef.current?.click()}
                  className="cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 transition hover:border-zinc-400"
                >
                  {mobilePreview ? (
                    <div className="relative mx-auto aspect-[9/16] max-h-[200px] w-auto">
                      <Image
                        src={mobilePreview}
                        alt="모바일 미리보기"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                        <span className="text-sm font-medium text-white">
                          이미지 변경
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-[16/5] flex-col items-center justify-center text-zinc-400">
                      <svg
                        className="mb-2 h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                        />
                      </svg>
                      <span className="text-sm">모바일 이미지 업로드</span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  권장: 750 x 1000px (없으면 PC 이미지 사용)
                </p>
                <input
                  ref={mobileInputRef}
                  type="file"
                  name="mobile_image"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setMobilePreview(URL.createObjectURL(f))
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* 제목 / 부제목 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  제목
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={editingBanner?.title ?? ''}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="배너 제목 (이미지 위에 표시)"
                />
              </div>
              <div>
                <label
                  htmlFor="subtitle"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  부제목
                </label>
                <input
                  id="subtitle"
                  name="subtitle"
                  type="text"
                  defaultValue={editingBanner?.subtitle ?? ''}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="부제목 (선택)"
                />
              </div>
            </div>

            {/* 링크 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="link_url"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  링크 URL
                </label>
                <input
                  id="link_url"
                  name="link_url"
                  type="text"
                  defaultValue={editingBanner?.link_url ?? ''}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="/products/123"
                />
              </div>
              <div>
                <label
                  htmlFor="link_text"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  버튼 텍스트
                </label>
                <input
                  id="link_text"
                  name="link_text"
                  type="text"
                  defaultValue={editingBanner?.link_text ?? ''}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="자세히 보기"
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading
                  ? '저장 중...'
                  : mode === 'create'
                    ? '배너 추가'
                    : '수정 완료'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
