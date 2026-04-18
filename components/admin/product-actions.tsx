'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProduct, moveProductCategories } from '@/app/admin/(dashboard)/products/actions'

type Category = {
  id: string
  name: string
  category_no: string | null
  parent_id: string | null
  level: number
}

type ProductCategory = {
  id: string
  name: string
  category_no: string | null
}

export function ProductActions({
  productId,
  productName,
  currentCategories,
  allCategories,
}: {
  productId: string
  productName: string
  currentCategories: ProductCategory[]
  allCategories: Category[]
}) {
  const router = useRouter()
  const [showMove, setShowMove] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<string[]>(
    currentCategories.map((c) => c.id)
  )
  const [loading, setLoading] = useState(false)

  const level1 = allCategories.filter((c) => c.level === 1)

  function getChildren(parentId: string) {
    return allCategories.filter((c) => c.parent_id === parentId)
  }

  function toggleCategory(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  async function handleMove() {
    setLoading(true)
    await moveProductCategories(productId, selected)
    setLoading(false)
    setShowMove(false)
    router.refresh()
  }

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
        <button
          type="button"
          onClick={() => {
            setSelected(currentCategories.map((c) => c.id))
            setShowMove(true)
          }}
          className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-600 hover:bg-amber-100"
        >
          이동
        </button>
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

      {/* 상품 이동 모달 */}
      {showMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="border-b border-zinc-100 p-4">
              <h3 className="text-lg font-semibold text-zinc-900">상품 카테고리 이동</h3>
              <p className="mt-1 text-sm text-zinc-500">{productName}</p>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-4">
              <div className="space-y-2">
                {level1.map((cat1) => {
                  const children = getChildren(cat1.id)
                  return (
                    <div key={cat1.id} className="rounded-lg border border-zinc-200 p-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(cat1.id)}
                          onChange={() => toggleCategory(cat1.id)}
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                        <span className="text-sm font-semibold text-zinc-900">{cat1.name}</span>
                        {cat1.category_no && (
                          <span className="text-[10px] text-zinc-400">{cat1.category_no}</span>
                        )}
                      </label>

                      {children.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1">
                          {children.map((cat2) => {
                            const cat3s = getChildren(cat2.id)
                            return (
                              <div key={cat2.id}>
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(cat2.id)}
                                    onChange={() => toggleCategory(cat2.id)}
                                    className="h-3.5 w-3.5 rounded border-zinc-300"
                                  />
                                  <span className="text-sm text-zinc-700">{cat2.name}</span>
                                  {cat2.category_no && (
                                    <span className="text-[10px] text-zinc-400">{cat2.category_no}</span>
                                  )}
                                </label>

                                {cat3s.length > 0 && (
                                  <div className="ml-6 mt-1 space-y-0.5">
                                    {cat3s.map((cat3) => (
                                      <label key={cat3.id} className="flex cursor-pointer items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={selected.includes(cat3.id)}
                                          onChange={() => toggleCategory(cat3.id)}
                                          className="h-3 w-3 rounded border-zinc-300"
                                        />
                                        <span className="text-xs text-zinc-600">{cat3.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 p-4">
              <p className="text-xs text-zinc-500">
                {selected.length}개 카테고리 선택됨
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMove(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  취소
                </button>
                <button
                  onClick={handleMove}
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {loading ? '이동 중...' : '이동 완료'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
