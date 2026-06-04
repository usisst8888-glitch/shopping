'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteDesign } from '@/lib/types/design'
import { TiptapEditor } from '@/components/admin/tiptap-editor'
import { saveProductDetailFixed } from './actions'

export function ProductDetailFixedManager({
  siteId,
  design,
}: {
  siteId: string
  design: SiteDesign | null
}) {
  const router = useRouter()
  const [topHtml, setTopHtml] = useState(design?.product_detail_top_html ?? '')
  const [bottomHtml, setBottomHtml] = useState(design?.product_detail_bottom_html ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await saveProductDetailFixed(siteId, topHtml, bottomHtml)

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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">저장되었습니다.</div>
      )}

      {/* 상단 고정 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-zinc-900">상단 고정 콘텐츠</h3>
        <p className="mb-4 text-sm text-zinc-500">
          모든 상품 상세페이지의 상품 정보 위에 표시됩니다.
        </p>
        <TiptapEditor content={topHtml} onChange={setTopHtml} minHeight="200px" />
      </div>

      {/* 하단 고정 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-zinc-900">하단 고정 콘텐츠</h3>
        <p className="mb-4 text-sm text-zinc-500">
          모든 상품 상세페이지의 상품 정보 아래에 표시됩니다.
        </p>
        <TiptapEditor content={bottomHtml} onChange={setBottomHtml} minHeight="200px" />
      </div>

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  )
}
