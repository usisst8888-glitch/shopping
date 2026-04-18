'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProduct } from '@/app/admin/(dashboard)/products/actions'

export function ProductActions({
  productId,
  productSlug,
  productName,
}: {
  productId: string
  productSlug: string | null
  productName: string
}) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await deleteProduct(productId)
    setLoading(false)
    setShowDelete(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <Link
          href={`/admin/products/${productId}/edit`}
          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
        >
          수정
        </Link>
        <Link
          href={`/product/${productSlug || productId}`}
          target="_blank"
          className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-600 hover:bg-amber-100"
        >
          보기
        </Link>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="rounded bg-red-50 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
        >
          삭제
        </button>
      </div>

      {/* 삭제 확인 모달 */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-zinc-900">상품 삭제</h3>
            <p className="mb-4 text-sm text-zinc-600">
              <span className="font-medium">{productName}</span>을(를) 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
