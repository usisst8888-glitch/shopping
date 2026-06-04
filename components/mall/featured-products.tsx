'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatProductPrice } from '@/lib/format-price'

type Product = {
  id: string
  name: string
  slug: string | null
  price: number
  thumbnail_url: string | null
}

type Props = {
  products: Product[]
  mode: 'link' | 'expand'
  showMoreButton?: boolean
  display?: 'grid' | 'slider'
  perRow?: number
  rows?: number
  perRowMobile?: number
  rowsMobile?: number
  totalItems?: number
  autoSeconds?: number
  categoryHref: string
  fromCategoryId?: string
}

function ProductCard({ product, fromCategoryId }: { product: Product; fromCategoryId?: string }) {
  const cat = fromCategoryId ? `?cat=${fromCategoryId}` : ''
  return (
    <Link href={`/product/${product.slug || product.id}${cat}`} className="group block">
      <div className="aspect-square overflow-hidden bg-zinc-100">
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 준비중</div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-zinc-900 line-clamp-1">{product.name}</p>
        <p className="mt-1 text-sm font-bold text-zinc-900">{formatProductPrice(product.price)}</p>
      </div>
    </Link>
  )
}

function MoreLink({ href }: { href: string }) {
  return (
    <div className="mt-8 text-center">
      <Link
        href={href}
        className="inline-block rounded-[9px] border border-[#2c2c2c] px-5 py-2 text-[14px] text-[#2c2c2c] hover:bg-zinc-50"
      >
        더보기
      </Link>
    </div>
  )
}

export function FeaturedProducts(props: Props) {
  if (props.display === 'slider') return <SliderView {...props} />
  return <GridView {...props} />
}

// ── 단일 그리드 ──
function GridView({ products, mode, showMoreButton = true, perRow = 4, rows = 2, perRowMobile = 2, totalItems, categoryHref, fromCategoryId }: Props) {
  // 진열수가 있으면 우선, 없으면 perRow*rows
  const base = Math.max(1, totalItems ?? perRow * rows)
  const [visible, setVisible] = useState(base)
  const shown = mode === 'expand' ? products.slice(0, visible) : products.slice(0, base)
  const canExpand = mode === 'expand' && visible < products.length

  return (
    <>
      <div
        className="grid gap-x-4 gap-y-8 [grid-template-columns:repeat(var(--per-m),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--per-d),minmax(0,1fr))]"
        style={{ '--per-m': perRowMobile, '--per-d': perRow } as CSSProperties}
      >
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} fromCategoryId={fromCategoryId} />
        ))}
      </div>

      {showMoreButton && (mode === 'expand' ? (
        canExpand && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + base)}
              className="inline-block rounded-[9px] border border-[#2c2c2c] px-5 py-2 text-[14px] text-[#2c2c2c] hover:bg-zinc-50"
            >
              더보기
            </button>
          </div>
        )
      ) : (
        <MoreLink href={categoryHref} />
      ))}
    </>
  )
}

// ── 한 줄짜리 독립 슬라이더 (자기만의 좌우 화살표/자동재생) ──
function RowSlider({
  products,
  perRow,
  perRowMobile,
  autoSeconds,
  fromCategoryId,
}: {
  products: Product[]
  perRow: number
  perRowMobile: number
  autoSeconds: number
  fromCategoryId?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  const scrollByCol = useCallback((dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const card = el.querySelector('[data-card]') as HTMLElement | null
    const step = card ? card.offsetWidth + 16 : el.clientWidth / 2
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!autoSeconds || autoSeconds <= 0 || paused) return
    const t = setInterval(() => scrollByCol(1), autoSeconds * 1000)
    return () => clearInterval(t)
  }, [autoSeconds, paused, scrollByCol])

  const showArrows = products.length > perRow

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        ref={ref}
        className="grid grid-flow-col gap-x-4 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [grid-auto-columns:calc((100%-(var(--per-m)-1)*1rem)/var(--per-m))] md:[grid-auto-columns:calc((100%-(var(--per-d)-1)*1rem)/var(--per-d))]"
        style={{ '--per-m': perRowMobile, '--per-d': perRow } as CSSProperties}
      >
        {products.map((p) => (
          <div data-card key={p.id}>
            <ProductCard product={p} fromCategoryId={fromCategoryId} />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="이전"
            onClick={() => scrollByCol(-1)}
            className="absolute -left-3 top-[38%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md transition hover:bg-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="다음"
            onClick={() => scrollByCol(1)}
            className="absolute -right-3 top-[38%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md transition hover:bg-white"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  )
}

// ── 가로 슬라이드: 줄마다 독립 슬라이더, 더보기로 줄 1개씩 추가 ──
function SliderView({ products, mode, showMoreButton = true, perRow = 4, rows = 2, perRowMobile = 2, autoSeconds = 0, categoryHref, fromCategoryId }: Props) {
  // 더보기를 누르면 줄(독립 슬라이더)을 1개씩 추가
  const [displayRows, setDisplayRows] = useState(Math.max(1, rows))
  // 한 줄(슬라이더)에 담을 상품 수 (화살표로 가로 스크롤할 분량) — PC 기준
  const chunkSize = Math.max(perRow * 3, perRow + 1)
  const totalRows = Math.max(1, Math.ceil(products.length / chunkSize))
  const shownRows = Math.min(displayRows, totalRows)
  const hasMore = mode === 'expand' && shownRows < totalRows

  return (
    <>
      <div className="space-y-10">
        {Array.from({ length: shownRows }).map((_, i) => (
          <RowSlider
            key={i}
            products={products.slice(i * chunkSize, (i + 1) * chunkSize)}
            perRow={perRow}
            perRowMobile={perRowMobile}
            autoSeconds={autoSeconds}
            fromCategoryId={fromCategoryId}
          />
        ))}
      </div>

      {showMoreButton && (mode === 'expand' ? (
        hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setDisplayRows((r) => r + 1)}
              className="inline-block rounded-[9px] border border-[#2c2c2c] px-5 py-2 text-[14px] text-[#2c2c2c] hover:bg-zinc-50"
            >
              더보기
            </button>
          </div>
        )
      ) : (
        <MoreLink href={categoryHref} />
      ))}
    </>
  )
}
