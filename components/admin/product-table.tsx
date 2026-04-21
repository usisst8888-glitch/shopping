'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toggleProductActive } from '@/app/admin/(dashboard)/products/actions'

type Product = {
  id: string
  name: string
  slug: string | null
  price: number
  thumbnail_url: string | null
  is_active: boolean
  created_at: string
  categories?: { id: string; name: string; category_no: string | null }[]
}

export function ProductTable({
  products,
  total,
  page,
  size,
}: {
  products: Product[]
  total: number
  page: number
  size: number
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const allSelected = products.length > 0 && selected.size === products.length
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function handleBulkDelete() {
    const ids = [...selected]
    setSelected(new Set())
    setShowDeleteModal(false)

    // API로 삭제 요청 → 백엔드에서 독립적으로 처리 (페이지 이동해도 계속 진행)
    fetch('/api/products/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      keepalive: true,
    }).catch(() => {})

    router.refresh()
  }

  return (
    <>
      {/* 선택 액션 바 */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-zinc-900 px-5 py-3 text-white shadow-lg">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-900">
            {selected.size}
          </div>
          <span className="text-sm">개 선택됨</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={async () => {
                for (const id of selected) {
                  await toggleProductActive(id, true)
                }
                setSelected(new Set())
                router.refresh()
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              판매중
            </button>
            <button
              onClick={async () => {
                for (const id of selected) {
                  await toggleProductActive(id, false)
                }
                setSelected(new Set())
                router.refresh()
              }}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              숨김
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              선택 해제
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              선택 삭제
            </button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">상품</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">가격</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">등록일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">상태</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((product, idx) => {
                const isChecked = selected.has(product.id)
                return (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      isChecked ? 'bg-blue-50/50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <td className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(product.id)}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {total - ((page - 1) * size + idx)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.thumbnail_url ? (
                          <img
                            src={product.thumbnail_url}
                            alt={product.name}
                            className="h-11 w-11 flex-shrink-0 rounded-lg object-cover ring-1 ring-zinc-200"
                          />
                        ) : (
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-zinc-400">
                            없음
                          </div>
                        )}
                        <p className="font-medium text-zinc-900 line-clamp-1">{product.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900 whitespace-nowrap">
                      {product.price.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.categories?.slice(0, 3).map((cat) => (
                          <span
                            key={cat.id}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                          >
                            {cat.name}
                          </span>
                        ))}
                        {(product.categories?.length ?? 0) > 3 && (
                          <span className="text-[10px] text-zinc-400">
                            +{(product.categories?.length ?? 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(product.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          await toggleProductActive(product.id, !product.is_active)
                          router.refresh()
                        }}
                        className={`inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80 ${
                          product.is_active
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200'
                        }`}
                        title={product.is_active ? '클릭하면 숨김 처리' : '클릭하면 판매중으로 변경'}
                      >
                        {product.is_active ? '판매중' : '숨김'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition hover:bg-blue-100"
                        >
                          수정
                        </Link>
                        <Link
                          href={`/product/${product.slug || product.id}`}
                          target="_blank"
                          className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-600 transition hover:bg-amber-100"
                        >
                          보기
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(new Set([product.id]))
                            setShowDeleteModal(true)
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className="rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500 transition hover:bg-red-100"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-red-50 px-6 py-5">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <h3 className="text-center text-lg font-bold text-zinc-900">
                상품 삭제
              </h3>
              <p className="mt-1 text-center text-sm text-zinc-600">
                선택한 <span className="font-bold text-red-600">{selected.size}개</span> 상품을 삭제하시겠습니까?
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelected(new Set())
                }}
                className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? `삭제 중... (${selected.size}개)` : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
