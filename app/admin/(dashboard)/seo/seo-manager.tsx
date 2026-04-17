'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateSeoSettings } from './actions'

type SeoData = {
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  seo_og_image: string | null
  seo_favicon: string | null
  seo_google_verification: string | null
  seo_naver_verification: string | null
}

export function SeoManager({
  siteId,
  seo,
}: {
  siteId: string
  seo: SeoData | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // OG 이미지 미리보기
  const [ogPreview, setOgPreview] = useState<string | null>(seo?.seo_og_image ?? null)
  const [removeOg, setRemoveOg] = useState(false)

  // 파비콘 미리보기
  const [faviconPreview, setFaviconPreview] = useState<string | null>(seo?.seo_favicon ?? null)
  const [removeFavicon, setRemoveFavicon] = useState(false)

  function handleOgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setOgPreview(URL.createObjectURL(file))
      setRemoveOg(false)
    }
  }

  function handleRemoveOg() {
    setOgPreview(null)
    setRemoveOg(true)
    const input = document.getElementById('seo_og_image') as HTMLInputElement
    if (input) input.value = ''
  }

  function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFaviconPreview(URL.createObjectURL(file))
      setRemoveFavicon(false)
    }
  }

  function handleRemoveFavicon() {
    setFaviconPreview(null)
    setRemoveFavicon(true)
    const input = document.getElementById('seo_favicon') as HTMLInputElement
    if (input) input.value = ''
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    if (removeOg) formData.set('remove_og_image', 'true')
    if (removeFavicon) formData.set('remove_favicon', 'true')

    const result = await updateSeoSettings(siteId, formData)

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
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          SEO 설정이 저장되었습니다.
        </div>
      )}

      {/* 기본 메타 정보 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">기본 메타 정보</h3>
        <p className="mb-4 text-sm text-zinc-500">
          검색엔진에 노출되는 사이트의 기본 정보입니다.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="seo_title" className="mb-1 block text-sm font-medium text-zinc-700">
              메타 타이틀
            </label>
            <input
              id="seo_title"
              name="seo_title"
              type="text"
              defaultValue={seo?.seo_title ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="사이트 타이틀 (검색결과에 표시)"
            />
            <p className="mt-1 text-xs text-zinc-400">60자 이내 권장. 비워두면 사이트명이 사용됩니다.</p>
          </div>

          <div>
            <label htmlFor="seo_description" className="mb-1 block text-sm font-medium text-zinc-700">
              메타 설명
            </label>
            <textarea
              id="seo_description"
              name="seo_description"
              rows={3}
              defaultValue={seo?.seo_description ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="사이트에 대한 간단한 설명 (검색결과에 표시)"
            />
            <p className="mt-1 text-xs text-zinc-400">160자 이내 권장.</p>
          </div>

          <div>
            <label htmlFor="seo_keywords" className="mb-1 block text-sm font-medium text-zinc-700">
              키워드
            </label>
            <input
              id="seo_keywords"
              name="seo_keywords"
              type="text"
              defaultValue={seo?.seo_keywords ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="쇼핑몰, 패션, 브랜드 (쉼표로 구분)"
            />
            <p className="mt-1 text-xs text-zinc-400">쉼표(,)로 구분하여 입력하세요.</p>
          </div>
        </div>
      </div>

      {/* OG 이미지 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">소셜 공유 이미지 (OG Image)</h3>
        <p className="mb-4 text-sm text-zinc-500">
          카카오톡, 페이스북, 트위터 등에서 링크 공유 시 표시되는 이미지입니다.
        </p>

        <div className="flex items-start gap-6">
          {ogPreview ? (
            <div className="relative">
              <img
                src={ogPreview}
                alt="OG 이미지 미리보기"
                className="h-32 w-auto max-w-[300px] rounded-lg border border-zinc-200 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveOg}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="flex h-32 w-[300px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-400">
              이미지 없음
            </div>
          )}

          <div>
            <label
              htmlFor="seo_og_image"
              className="inline-block cursor-pointer rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
            >
              {ogPreview ? '이미지 변경' : '이미지 업로드'}
            </label>
            <input
              id="seo_og_image"
              name="seo_og_image"
              type="file"
              accept="image/*"
              onChange={handleOgChange}
              className="hidden"
            />
            <p className="mt-1 text-xs text-zinc-400">1200x630px 권장</p>
          </div>
        </div>
      </div>

      {/* 파비콘 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">파비콘</h3>
        <p className="mb-4 text-sm text-zinc-500">
          브라우저 탭에 표시되는 작은 아이콘입니다.
        </p>

        <div className="flex items-start gap-6">
          {faviconPreview ? (
            <div className="relative">
              <img
                src={faviconPreview}
                alt="파비콘 미리보기"
                className="h-16 w-16 rounded-lg border border-zinc-200 object-contain p-1"
              />
              <button
                type="button"
                onClick={handleRemoveFavicon}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-400">
              없음
            </div>
          )}

          <div>
            <label
              htmlFor="seo_favicon"
              className="inline-block cursor-pointer rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
            >
              {faviconPreview ? '변경' : '업로드'}
            </label>
            <input
              id="seo_favicon"
              name="seo_favicon"
              type="file"
              accept="image/png,image/x-icon,image/svg+xml"
              onChange={handleFaviconChange}
              className="hidden"
            />
            <p className="mt-1 text-xs text-zinc-400">32x32px 또는 64x64px PNG 권장</p>
          </div>
        </div>
      </div>

      {/* 검색엔진 인증 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">검색엔진 인증</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Google Search Console, Naver Search Advisor 인증 코드를 입력하세요.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="seo_google_verification" className="mb-1 block text-sm font-medium text-zinc-700">
              Google Search Console 인증 코드
            </label>
            <input
              id="seo_google_verification"
              name="seo_google_verification"
              type="text"
              defaultValue={seo?.seo_google_verification ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="Google 인증 코드 (content 값만 입력)"
            />
          </div>

          <div>
            <label htmlFor="seo_naver_verification" className="mb-1 block text-sm font-medium text-zinc-700">
              Naver Search Advisor 인증 코드
            </label>
            <input
              id="seo_naver_verification"
              name="seo_naver_verification"
              type="text"
              defaultValue={seo?.seo_naver_verification ?? ''}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="Naver 인증 코드 (content 값만 입력)"
            />
          </div>
        </div>
      </div>

      {/* 미리보기 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">검색결과 미리보기</h3>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-lg text-blue-700 hover:underline">
            {seo?.seo_title || '사이트 타이틀'}
          </p>
          <p className="text-sm text-green-700">https://yourdomain.com</p>
          <p className="mt-1 text-sm text-zinc-600">
            {seo?.seo_description || '사이트 설명이 여기에 표시됩니다.'}
          </p>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? '저장 중...' : 'SEO 설정 저장'}
        </button>
      </div>
    </form>
  )
}
