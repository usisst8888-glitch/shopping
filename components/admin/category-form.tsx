'use client'

import { useState, useRef } from 'react'
import { createCategory, updateCategory, uploadCategoryImage } from '@/app/admin/(dashboard)/categories/actions'
import type { Category } from '@/app/admin/(dashboard)/categories/actions'

export function CategoryForm({
  mode,
  category,
  parentId,
  parentLevel,
  onDone,
}: {
  mode: 'create' | 'edit'
  category?: Category | null
  parentId?: string | null
  parentLevel?: number
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [isMain, setIsMain] = useState(category?.is_main ?? false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 카테고리 페이지 배너
  const [bannerImageUrl, setBannerImageUrl] = useState(category?.banner_url ?? '')
  const [bannerUploading, setBannerUploading] = useState(false)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(category?.banner_video_url ?? null)
  const [bannerVideoName, setBannerVideoName] = useState<string | null>(
    category?.banner_video_url ? category.banner_video_url.split('/').pop() ?? '등록됨' : null
  )
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [bannerShowOverlay, setBannerShowOverlay] = useState(category?.banner_show_overlay ?? true)

  // 상품 목록 페이징 설정
  const [paginationMode, setPaginationMode] = useState<'load_more' | 'pages'>(category?.pagination_mode ?? 'load_more')
  const [productsPerRow, setProductsPerRow] = useState<number>(category?.products_per_row ?? 4)
  const [productsRows, setProductsRows] = useState<number>(category?.products_rows ?? 10)

  const isEdit = mode === 'edit' && category
  const newLevel = parentLevel ? parentLevel + 1 : 1

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.set('file', file)

    const result = await uploadCategoryImage(formData)
    if (result.url) {
      setImageUrl(result.url)
    } else {
      setError(result.error ?? '이미지 업로드 실패')
    }
    setUploading(false)
  }

  async function handleBannerImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setBannerUploading(true)
    const fd = new FormData()
    fd.set('file', file)

    const result = await uploadCategoryImage(fd)
    if (result.url) {
      setBannerImageUrl(result.url)
    } else {
      setError(result.error ?? '배너 이미지 업로드 실패')
    }
    setBannerUploading(false)
  }

  async function handleBannerVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setVideoUploading(true)
    setVideoProgress(0)
    setBannerVideoName(file.name)

    try {
      // 1. 서버에서 presigned URL 받기
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })
      const { signedUrl, publicUrl, error: urlError } = await res.json()
      if (urlError) throw new Error(urlError)

      // 2. 브라우저에서 R2로 직접 업로드
      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setVideoProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('업로드 실패')))
        xhr.onerror = () => reject(new Error('업로드 실패'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.send(file)
      })

      setBannerVideoUrl(publicUrl)
    } catch (err) {
      setBannerVideoName(null)
      setBannerVideoUrl(null)
      alert(err instanceof Error ? err.message : '영상 업로드 실패')
    } finally {
      setVideoUploading(false)
      setVideoProgress(0)
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    formData.set('image_url', imageUrl)
    formData.set('is_main', String(isMain))
    formData.set('banner_url', bannerImageUrl)
    formData.set('banner_video_url', bannerVideoUrl ?? '')
    formData.set('banner_show_overlay', String(bannerShowOverlay))
    formData.set('pagination_mode', paginationMode)
    formData.set('products_per_row', String(productsPerRow))
    formData.set('products_rows', String(productsRows))

    let result
    if (isEdit) {
      result = await updateCategory(formData)
    } else {
      result = await createCategory(formData)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onDone()
    }
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">
        {isEdit ? '카테고리 수정' : parentId ? `${newLevel}차 카테고리 추가` : '1차 카테고리 추가'}
      </h3>

      <form action={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {isEdit && <input type="hidden" name="id" value={category.id} />}
        {parentId && <input type="hidden" name="parent_id" value={parentId} />}

        <div>
          <label htmlFor="category_no" className="mb-1 block text-sm font-medium text-zinc-700">
            카테고리 번호
          </label>
          <input
            id="category_no"
            name="category_no"
            type="text"
            defaultValue={isEdit ? category.category_no ?? '' : ''}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="예: CATE7"
          />
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
            카테고리 이름
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={isEdit ? category.name : ''}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="카테고리 이름을 입력하세요"
          />
        </div>

        {/* 카테고리 이미지 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            카테고리 이미지
          </label>
          <div className="flex items-start gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="카테고리" className="h-full w-full object-cover" />
              ) : (
                <span className="text-center text-[10px] text-zinc-400">
                  {uploading ? '업로드 중...' : '클릭하여\n이미지 선택'}
                </span>
              )}
            </div>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-xs text-red-500 hover:underline"
              >
                삭제
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <p className="mt-1 text-xs text-zinc-400">메인 페이지 카테고리 섹션에 표시됩니다.</p>
        </div>

        <div>
          <label htmlFor="sort_order" className="mb-1 block text-sm font-medium text-zinc-700">
            정렬 순서
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={isEdit ? category.sort_order : 0}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="0"
          />
          <p className="mt-1 text-xs text-zinc-400">숫자가 작을수록 앞에 표시됩니다.</p>
        </div>

        {/* 메인 페이지 표시 토글 */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
          <button
            type="button"
            onClick={() => setIsMain(!isMain)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isMain ? 'bg-zinc-900' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                isMain ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-zinc-900">메인 페이지에 표시</p>
            <p className="text-xs text-zinc-400">활성화하면 메인 페이지 카테고리 섹션에 노출됩니다.</p>
          </div>
        </div>

        {/* 카테고리 페이지 배너 */}
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-900">카테고리 페이지 배너</p>
          <p className="mb-3 text-xs text-zinc-400">
            이 카테고리(및 하위) 페이지 상단에 표시됩니다. 영상이 있으면 영상이 우선됩니다.
          </p>

          {/* 배너 이미지 */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-zinc-600">배너 이미지</label>
            <div className="flex items-start gap-3">
              {bannerImageUrl ? (
                <div className="relative">
                  <img
                    src={bannerImageUrl}
                    alt="카테고리 배너"
                    className="h-20 w-auto max-w-[280px] rounded-lg border border-zinc-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setBannerImageUrl('')}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="flex h-20 w-[280px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-xs text-zinc-400">
                  이미지 없음
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  {bannerUploading ? '업로드 중...' : bannerImageUrl ? '이미지 변경' : '이미지 업로드'}
                </button>
                <p className="mt-1 text-[11px] text-zinc-400">권장: 1920 x 450px</p>
              </div>
            </div>
            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerImageUpload}
            />
          </div>

          {/* 배너 영상 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">배너 영상 (선택)</label>
            <div className="flex items-center gap-3">
              {bannerVideoName ? (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                  <span className="max-w-[160px] truncate text-xs text-zinc-700">{bannerVideoName}</span>
                  {!videoUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setBannerVideoName(null)
                        setBannerVideoUrl(null)
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-9 w-[160px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-xs text-zinc-400">
                  영상 없음
                </div>
              )}
              <label
                className={`cursor-pointer rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 ${videoUploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                {videoUploading ? `업로드 중... ${videoProgress}%` : bannerVideoName ? '영상 변경' : '영상 업로드'}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleBannerVideoChange}
                  disabled={videoUploading}
                />
              </label>
            </div>
            {videoUploading && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full bg-zinc-900 transition-all" style={{ width: `${videoProgress}%` }} />
              </div>
            )}
            <p className="mt-1 text-[11px] text-zinc-400">영상 등록 시 이미지 대신 자동재생됩니다. (MP4 권장)</p>
          </div>

          {/* 오버레이(텍스트 + 버튼) 표시 토글 */}
          <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setBannerShowOverlay(!bannerShowOverlay)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                bannerShowOverlay ? 'bg-zinc-900' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  bannerShowOverlay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <p className="text-xs font-medium text-zinc-900">배너 위 텍스트·버튼 표시</p>
              <p className="text-[11px] text-zinc-400">끄면 &quot;HIGH-END&quot; 문구와 제작과정/구매후기 버튼이 숨겨집니다.</p>
            </div>
          </div>
        </div>

        {/* 상품 목록 표시 (페이징 / 그리드) */}
        <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-900">상품 목록 표시</p>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-600">페이징 방식</span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  paginationMode === 'load_more'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="radio"
                  name="pagination_mode_ui"
                  className="sr-only"
                  checked={paginationMode === 'load_more'}
                  onChange={() => setPaginationMode('load_more')}
                />
                <span className="font-medium">더보기</span>
                <span className="text-[11px] text-zinc-500">하단 버튼으로 추가 로드</span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  paginationMode === 'pages'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="radio"
                  name="pagination_mode_ui"
                  className="sr-only"
                  checked={paginationMode === 'pages'}
                  onChange={() => setPaginationMode('pages')}
                />
                <span className="font-medium">페이지 번호</span>
                <span className="text-[11px] text-zinc-500">1·2·3… 인디케이터</span>
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="products_per_row" className="mb-1 block text-xs font-medium text-zinc-600">
                한 줄 상품 수
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="products_per_row"
                  type="number"
                  min={1}
                  max={8}
                  value={productsPerRow}
                  onChange={(e) =>
                    setProductsPerRow(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="h-10 w-24 rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-900 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">개 (1~8)</span>
              </div>
            </div>
            <div>
              <label htmlFor="products_rows" className="mb-1 block text-xs font-medium text-zinc-600">
                한 페이지 줄 수
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="products_rows"
                  type="number"
                  min={1}
                  max={30}
                  value={productsRows}
                  onChange={(e) =>
                    setProductsRows(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="h-10 w-24 rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-900 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">줄 (1~30)</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            한 페이지에 총 {productsPerRow * productsRows}개 상품이 표시됩니다.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || uploading || bannerUploading || videoUploading}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
