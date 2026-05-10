'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Product = {
  id: string
  name: string
  slug: string | null
  price: number
  thumbnail_url: string | null
}

export function CategoryProductList({
  initialProducts,
  categoryNos,
  total,
}: {
  initialProducts: Product[]
  categoryNos: string[]
  total: number
}) {
  const pathname = usePathname()
  const storageKey = `cat-products-${pathname}`

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const hasMore = products.length < total

  // 마운트 시 sessionStorage에서 복원
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.nos === categoryNos.join(',') && parsed.products?.length > initialProducts.length) {
          setProducts(parsed.products)
          setTimeout(() => window.scrollTo(0, parsed.scrollY || 0), 100)
        }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 상품 변경 시 sessionStorage 저장
  useEffect(() => {
    if (products.length > initialProducts.length) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({
          nos: categoryNos.join(','),
          products,
          scrollY: window.scrollY,
        }))
      } catch {}
    }
  }, [products, categoryNos, storageKey, initialProducts.length])

  // 링크 클릭 시 현재 스크롤 위치 저장
  function handleClick() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        nos: categoryNos.join(','),
        products,
        scrollY: window.scrollY,
      }))
    } catch {}
  }

  async function loadMore() {
    setLoading(true)
    const res = await fetch(
      `/api/category-products?nos=${categoryNos.join(',')}&offset=${products.length}&limit=40`
    )
    const data = await res.json()
    setProducts((prev) => [...prev, ...data.products])
    setLoading(false)
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">이 카테고리에 등록된 상품이 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug || product.id}`}
            onClick={handleClick}
            className="group"
          >
            <div className="aspect-square overflow-hidden bg-zinc-100">
              {product.thumbnail_url ? (
                <img
                  src={product.thumbnail_url}
                  alt={product.name}
                  className="w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 준비중</div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-sm text-zinc-900 line-clamp-1">{product.name}</p>
              <p className="mt-1 text-sm font-bold text-zinc-900">
                {product.price.toLocaleString()}원
              </p>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-block rounded-[9px] border border-[#2c2c2c] px-8 py-2.5 text-[14px] text-[#2c2c2c] disabled:opacity-50"
          >
            {loading ? '로딩 중...' : '더보기'}
          </button>
        </div>
      )}
    </>
  )
}
