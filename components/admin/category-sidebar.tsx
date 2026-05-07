'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Category = {
  id: string
  name: string
  category_no: string | null
  parent_id: string | null
  level: number
}

export function CategorySidebar({
  categories,
  currentCategoryId,
}: {
  categories: Category[]
  currentCategoryId: string
}) {
  const searchParams = useSearchParams()

  function buildUrl(catId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (catId) {
      params.set('category', catId)
    } else {
      params.delete('category')
    }
    params.delete('page')
    const qs = params.toString()
    return `/admin/products${qs ? `?${qs}` : ''}`
  }

  const level1 = categories.filter((c) => c.level === 1)

  return (
    <div className="w-56 flex-shrink-0">
      <div className="sticky top-20 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-zinc-900">카테고리</h3>
        <div className="space-y-0.5">
          <Link
            href={buildUrl('')}
            className={`block rounded-lg px-3 py-2 text-[13px] ${
              !currentCategoryId ? 'bg-zinc-900 font-bold text-white' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            전체
          </Link>
          {level1.map((cat1) => {
            const isActive1 = currentCategoryId === cat1.id
            const children = categories.filter((c) => c.parent_id === cat1.id)
            const hasActiveChild = children.some((c) => c.id === currentCategoryId)

            return (
              <div key={cat1.id}>
                <Link
                  href={buildUrl(cat1.id)}
                  className={`block rounded-lg px-3 py-2 text-[13px] ${
                    isActive1 ? 'bg-zinc-900 font-bold text-white' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {cat1.name}
                </Link>
                {(isActive1 || hasActiveChild) && children.length > 0 && (
                  <div className="ml-3 border-l border-zinc-200 pl-2">
                    {children.map((cat2) => {
                      const isActive2 = currentCategoryId === cat2.id
                      return (
                        <Link
                          key={cat2.id}
                          href={buildUrl(cat2.id)}
                          className={`block rounded-lg px-3 py-1.5 text-[12px] ${
                            isActive2 ? 'font-bold text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                          }`}
                        >
                          {cat2.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
