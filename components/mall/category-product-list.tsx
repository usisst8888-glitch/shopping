'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { formatProductPrice } from '@/lib/format-price'

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
  fromCategoryId,
  paginationMode = 'load_more',
  perRow = 4,
  rows = 10,
  page = 1,
}: {
  initialProducts: Product[]
  categoryNos: string[]
  total: number
  fromCategoryId?: string
  paginationMode?: 'load_more' | 'pages'
  perRow?: number
  rows?: number
  page?: number
}) {
  const catParam = fromCategoryId ? `?cat=${fromCategoryId}` : ''
  const pathname = usePathname()
  const storageKey = `cat-products-${pathname}`

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const pageSize = Math.max(1, perRow * rows)
  const hasMore = paginationMode === 'load_more' && products.length < total
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  // 모바일은 항상 2열로 유지하여 가독성 보장 (사용자 설정은 md 이상부터 적용)
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(2, minmax(0, 1fr))`,
  }
  const mdGridStyle: React.CSSProperties = {
    ['--cat-cols' as string]: String(perRow),
  }

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
      `/api/category-products?nos=${categoryNos.join(',')}&offset=${products.length}&limit=${pageSize}`
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
      <div
        className="grid gap-x-4 gap-y-8 md:[grid-template-columns:repeat(var(--cat-cols),minmax(0,1fr))]"
        style={{ ...gridStyle, ...mdGridStyle }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug || product.id}${catParam}`}
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
                {formatProductPrice(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {paginationMode === 'load_more' && hasMore && (
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

      {paginationMode === 'pages' && totalPages > 1 && (
        <PageIndicator currentPage={page} totalPages={totalPages} basePath={pathname} />
      )}
    </>
  )
}

function PageIndicator({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number
  totalPages: number
  basePath: string
}) {
  // 윈도우: 현재 페이지 기준 좌우 2개 + 처음/끝
  const windowSize = 2
  const pages: (number | 'gap')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - windowSize && i <= currentPage + windowSize)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap')
    }
  }
  const href = (p: number) => `${basePath}${p > 1 ? `?page=${p}` : ''}`
  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="페이지">
      <PageBtn href={href(Math.max(1, currentPage - 1))} disabled={currentPage === 1} label="이전" />
      {pages.map((p, idx) =>
        p === 'gap' ? (
          <span key={`gap-${idx}`} className="px-2 text-zinc-400">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={`flex h-9 min-w-[36px] items-center justify-center rounded-md border text-sm ${
              p === currentPage
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </Link>
        ),
      )}
      <PageBtn
        href={href(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        label="다음"
      />
    </nav>
  )
}

function PageBtn({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return (
      <span className="flex h-9 items-center rounded-md border border-zinc-200 px-3 text-sm text-zinc-300">
        {label}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      {label}
    </Link>
  )
}
