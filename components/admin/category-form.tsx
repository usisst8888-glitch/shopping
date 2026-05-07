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
  const [bannerUrl, setBannerUrl] = useState((category as any)?.banner_url ?? '')
  const [bannerTitle, setBannerTitle] = useState((category as any)?.banner_title ?? '')
  const [uploading, setUploading] = useState(false)
  const [isMain, setIsMain] = useState(category?.is_main ?? false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

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

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    formData.set('image_url', imageUrl)
    formData.set('banner_url', bannerUrl)
    formData.set('banner_title', bannerTitle)
    formData.set('is_main', String(isMain))

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

        {/* 배너 이미지 (1차 카테고리만) */}
        {(!parentId || (isEdit && category && category.level === 1)) && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">카테고리 페이지 배너</label>
            <div className="flex items-start gap-3">
              <div
                onClick={() => bannerInputRef.current?.click()}
                className="flex h-24 w-60 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400"
              >
                {bannerUrl ? (
                  <img src={bannerUrl} alt="배너" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-center text-[10px] text-zinc-400">배너 이미지 업로드</span>
                )}
              </div>
              {bannerUrl && (
                <button type="button" onClick={() => setBannerUrl('')} className="text-xs text-red-500 hover:underline">삭제</button>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                const fd = new FormData()
                fd.set('file', file)
                const res = await fetch('/api/upload', { method: 'POST', body: fd })
                const result = await res.json()
                if (result.url) setBannerUrl(result.url)
                setUploading(false)
              }}
            />
            <input
              type="text"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              placeholder="배너 타이틀 (예: HIGH-END)"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-400">카테고리 페이지 상단에 표시되는 배너입니다. 권장: 1920x400px</p>
          </div>
        )}

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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || uploading}
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
