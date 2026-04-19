'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct, updateProduct } from '@/app/admin/(dashboard)/products/actions'
import { TiptapEditor } from './tiptap-editor'

type FlatCategory = {
  id: string
  name: string
  parent_id: string | null
  level: number
}

type ProductInitial = {
  id: string
  name: string
  summary: string | null
  description: string | null
  price: number
  thumbnail_url: string | null
  sub_images: string[] | null
  category_ids: string[]
}

function extractCfUrls(html: string): string[] {
  const matches = html.match(/https:\/\/imagedelivery\.net\/[^"'\s)]+/g)
  return matches ? [...new Set(matches)] : []
}

async function deleteCfImage(url: string) {
  if (!url.includes('imagedelivery.net')) return
  fetch('/api/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).catch(() => {})
}

export function ProductForm({
  categories,
  product,
}: {
  categories: FlatCategory[]
  product?: ProductInitial
}) {
  const isEdit = !!product
  const router = useRouter()
  const storageKey = `product-form-${product?.id ?? 'new'}`

  // sessionStorage에서 저장된 데이터 복원
  function getStored() {
    if (typeof window === 'undefined') return null
    try {
      const saved = sessionStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  }

  const stored = useRef(getStored()).current

  // 원본 이미지 URL 추적 (취소 시 새로 추가된 것만 삭제하기 위해)
  const originalImagesRef = useRef<Set<string>>(new Set([
    ...(product?.thumbnail_url ? [product.thumbnail_url] : []),
    ...(product?.sub_images ?? []),
    ...extractCfUrls(product?.description ?? ''),
    ...extractCfUrls(product?.summary ?? ''),
  ]))

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState(stored?.thumbnailUrl ?? product?.thumbnail_url ?? '')
  const [thumbnailPreview, setThumbnailPreview] = useState(stored?.thumbnailUrl ?? product?.thumbnail_url ?? '')
  const [subImages, setSubImages] = useState<string[]>(stored?.subImages ?? product?.sub_images ?? [])
  const [summary, setSummary] = useState(stored?.summary ?? product?.summary ?? '')
  const [description, setDescription] = useState(stored?.description ?? product?.description ?? '')
  const [formName, setFormName] = useState(stored?.name ?? product?.name ?? '')
  const [formPrice, setFormPrice] = useState(stored?.price ?? product?.price ?? '')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(stored?.categoryIds ?? product?.category_ids ?? [])
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const ids = stored?.categoryIds ?? product?.category_ids ?? []
    const expanded = new Set<string>()
    for (const id of ids) {
      let parentId = categories.find((c) => c.id === id)?.parent_id ?? null
      while (parentId) {
        expanded.add(parentId)
        parentId = categories.find((c) => c.id === parentId)?.parent_id ?? null
      }
    }
    return expanded
  })
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingSub, setUploadingSub] = useState(false)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const subInputRef = useRef<HTMLInputElement>(null)

  // 폼 상태를 sessionStorage에 자동 저장
  useEffect(() => {
    const data = {
      name: formName,
      price: formPrice,
      thumbnailUrl,
      subImages,
      summary,
      description,
      categoryIds: [...selectedCategories],
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data))
    } catch {}
  }, [formName, formPrice, thumbnailUrl, subImages, summary, description, selectedCategories, storageKey])

  // 하위 카테고리가 있는 카테고리 ID 집합
  const hasChildren = new Set(
    categories.filter((c) => c.parent_id).map((c) => c.parent_id!)
  )

  function toggleExpand(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 카테고리가 보여야 하는지 확인 (부모가 모두 펼쳐져 있어야 함)
  function isCategoryVisible(cat: FlatCategory) {
    if (cat.level === 1) return true
    // 부모 카테고리가 펼쳐져 있는지 확인
    let parentId = cat.parent_id
    while (parentId) {
      if (!expandedCategories.has(parentId)) return false
      const parent = categories.find((c) => c.id === parentId)
      parentId = parent?.parent_id ?? null
    }
    return true
  }

  async function uploadFile(file: File): Promise<{ url?: string; error?: string }> {
    const formData = new FormData()
    formData.set('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      return await res.json()
    } catch {
      return { error: '업로드 중 오류가 발생했습니다.' }
    }
  }

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingThumb(true)
    setThumbnailPreview(URL.createObjectURL(file))

    const result = await uploadFile(file)
    if (result.url) {
      setThumbnailUrl(result.url)
    } else {
      setError(result.error ?? '썸네일 업로드 실패')
      setThumbnailPreview('')
    }
    setUploadingThumb(false)
  }

  async function handleSubImagesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploadingSub(true)
    const uploaded: string[] = []

    for (const file of files) {
      const result = await uploadFile(file)
      if (result.url) {
        uploaded.push(result.url)
      } else {
        setError(result.error ?? '서브 이미지 업로드 실패')
      }
    }

    setSubImages((prev) => [...prev, ...uploaded])
    setUploadingSub(false)
    if (subInputRef.current) subInputRef.current.value = ''
  }

  function removeSubImage(index: number) {
    const removed = subImages[index]
    setSubImages((prev) => prev.filter((_, i) => i !== index))
    if (removed) deleteCfImage(removed)
  }

  function promoteToMain(index: number) {
    setSubImages((prev) => {
      const next = [...prev]
      const picked = next.splice(index, 1)[0]
      if (thumbnailUrl) next.push(thumbnailUrl)
      setThumbnailUrl(picked)
      setThumbnailPreview(picked)
      return next
    })
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleCancel() {
    // 현재 폼에 있는 모든 이미지 수집
    const currentImages: string[] = []
    if (thumbnailUrl) currentImages.push(thumbnailUrl)
    currentImages.push(...subImages)
    currentImages.push(...extractCfUrls(summary))
    currentImages.push(...extractCfUrls(description))

    // 원본에 없는 이미지(새로 업로드된 것)만 Cloudflare에서 삭제
    const newImages = currentImages.filter((url) => !originalImagesRef.current.has(url))
    await Promise.allSettled(newImages.map(deleteCfImage))

    // sessionStorage 삭제
    sessionStorage.removeItem(storageKey)
    router.push('/admin/products')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('thumbnail_url', thumbnailUrl)
    formData.set('sub_images', JSON.stringify(subImages))
    formData.set('summary', summary)
    formData.set('description', description)
    formData.set('category_ids', JSON.stringify([...selectedCategories]))

    const result = isEdit
      ? await updateProduct(product!.id, formData)
      : await createProduct(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      sessionStorage.removeItem(storageKey)
      router.push('/admin/products')
    }
  }

  const levelColors = ['bg-blue-50', 'bg-green-50', 'bg-amber-50', 'bg-rose-50']

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 왼쪽: 상품 정보 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 썸네일 */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">상품 이미지</h3>

            {/* 대표 썸네일 */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                대표 썸네일 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-start gap-4">
                <div
                  onClick={() => thumbInputRef.current?.click()}
                  className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400"
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="썸네일" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-center text-xs text-zinc-400">
                      {uploadingThumb ? '업로드 중...' : '클릭하여\n이미지 선택'}
                    </span>
                  )}
                </div>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                />
                <p className="text-xs text-zinc-400">목록/상단에 노출되는 대표 이미지</p>
              </div>
            </div>

            {/* 서브 썸네일 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                서브 썸네일 {subImages.length > 0 && <span className="text-zinc-400">({subImages.length}장)</span>}
              </label>
              <div className="flex flex-wrap gap-3">
                {subImages.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="group relative h-28 w-28 overflow-hidden rounded-lg border border-zinc-200">
                    <img src={url} alt={`서브 ${idx + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1 bg-black/60 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => promoteToMain(idx)}
                        className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-900 hover:bg-zinc-100"
                      >
                        대표로
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSubImage(idx)}
                        className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                <div
                  onClick={() => subInputRef.current?.click()}
                  className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-center text-xs text-zinc-400 hover:border-zinc-400"
                >
                  {uploadingSub ? '업로드 중...' : '+ 추가'}
                </div>
              </div>
              <input
                ref={subInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleSubImagesUpload}
              />
              <p className="mt-2 text-xs text-zinc-400">여러 장 선택 가능. 이미지에 마우스를 올리면 대표 지정/삭제 가능</p>
            </div>
          </div>

          {/* 기본 정보 + 요약 설명 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900">기본 정보</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
                    상품명
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="상품명을 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="price" className="mb-1 block text-sm font-medium text-zinc-700">
                    가격 (원)
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    required
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900">요약 설명</h3>
              <TiptapEditor content={summary} onChange={setSummary} minHeight="120px" />
            </div>
          </div>

          {/* 상세 설명 (TipTap) */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">상세 설명</h3>
            <TiptapEditor content={description} onChange={setDescription} />
          </div>

          {/* 저장 */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || uploadingThumb || uploadingSub}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? '저장 중...' : isEdit ? '상품 수정' : '상품 등록'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              취소
            </button>
          </div>
        </div>

        {/* 오른쪽: 카테고리 선택 */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">
              카테고리 선택
              {selectedCategories.size > 0 && (
                <span className="ml-2 text-sm font-normal text-blue-600">
                  {selectedCategories.size}개 선택됨
                </span>
              )}
            </h3>
            <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {categories.map((cat) => {
                if (!isCategoryVisible(cat)) return null
                const isParent = hasChildren.has(cat.id)
                const isExpanded = expandedCategories.has(cat.id)

                return (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      isParent ? 'cursor-pointer hover:bg-zinc-50' : 'hover:bg-zinc-50'
                    } ${selectedCategories.has(cat.id) ? levelColors[cat.level - 1] : ''}`}
                    style={{ paddingLeft: `${(cat.level - 1) * 16 + 12}px` }}
                    onClick={() => { if (isParent) toggleExpand(cat.id) }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCategory(cat.id)
                      }}
                      className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded transition-colors ${
                        selectedCategories.has(cat.id)
                          ? 'bg-zinc-900 text-white'
                          : 'border border-zinc-300 bg-white hover:border-zinc-400'
                      }`}
                    >
                      {selectedCategories.has(cat.id) && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                      {cat.level}차
                    </span>
                    <span className="flex-1 text-zinc-700">{cat.name}</span>
                    {isParent && (
                      <svg
                        className={`h-3.5 w-3.5 flex-shrink-0 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )
              })}
              {categories.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-400">
                  등록된 카테고리가 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
