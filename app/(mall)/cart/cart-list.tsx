'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateCartQuantity,
  removeFromCart,
  clearCart,
  deleteCartItems,
  deleteSoldoutCartItems,
} from './actions'

type Product = {
  id: string
  name: string
  slug: string | null
  price: number
  thumbnail_url: string | null
  is_active?: boolean
  status?: string | null
}

type CartItem = {
  id: string
  quantity: number
  product_id: string
  product: Product | null
}

export function CartList({
  items: initialItems,
  shippingFee,
  freeShippingThreshold,
}: {
  items: CartItem[]
  shippingFee: number
  freeShippingThreshold: number
}) {
  const router = useRouter()

  // 카트 상태를 클라이언트에서 직접 관리 → 수량 +/- 즉시 반영
  const [items, setItems] = useState<CartItem[]>(initialItems)

  // 체크된 항목 id (기본 = 전체 선택)
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialItems.map((i) => i.id)))

  // 수량 변경을 서버에 디바운스 저장 (각 cart_item_id별 별도 타이머)
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const scheduleSaveQty = useCallback((id: string, qty: number) => {
    const map = debounceRef.current
    const prev = map.get(id)
    if (prev) clearTimeout(prev)
    const t = setTimeout(async () => {
      await updateCartQuantity(id, qty)
      map.delete(id)
    }, 350)
    map.set(id, t)
  }, [])

  function isSoldout(p: Product | null): boolean {
    if (!p) return true
    if (p.is_active === false) return true
    if (p.status === 'soldout' || p.status === 'hidden') return true
    return false
  }

  const allCheckable = items.filter((it) => !isSoldout(it.product))
  const allChecked = allCheckable.length > 0 && allCheckable.every((it) => checked.has(it.id))
  const someChecked = allCheckable.some((it) => checked.has(it.id)) && !allChecked

  function toggleAll(v: boolean) {
    if (v) setChecked(new Set(allCheckable.map((i) => i.id)))
    else setChecked(new Set())
  }

  function toggleOne(id: string, v: boolean) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (v) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setQuantityLocal(id: string, qty: number) {
    const next = Math.max(1, Math.min(99, qty))
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: next } : it)))
    scheduleSaveQty(id, next)
  }

  async function handleRemove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    await removeFromCart(id)
  }

  async function handleClearAll() {
    if (!confirm('장바구니의 모든 상품을 삭제하시겠습니까?')) return
    const r = await clearCart()
    if (r?.error) {
      alert(r.error)
      return
    }
    setItems([])
    setChecked(new Set())
    router.refresh()
  }

  async function handleDeleteSelected() {
    const ids = [...checked]
    if (ids.length === 0) {
      alert('삭제할 상품을 선택해주세요.')
      return
    }
    if (!confirm(`선택한 ${ids.length}개를 삭제하시겠습니까?`)) return
    setItems((prev) => prev.filter((it) => !checked.has(it.id)))
    setChecked(new Set())
    await deleteCartItems(ids)
    router.refresh()
  }

  async function handleDeleteSoldout() {
    const soldoutIds = items.filter((it) => isSoldout(it.product)).map((it) => it.id)
    if (soldoutIds.length === 0) {
      alert('품절된 상품이 없습니다.')
      return
    }
    if (!confirm(`품절/판매중지 상품 ${soldoutIds.length}개를 삭제하시겠습니까?`)) return
    const r = await deleteSoldoutCartItems()
    if (r?.error) {
      alert(r.error)
      return
    }
    setItems((prev) => prev.filter((it) => !soldoutIds.includes(it.id)))
    setChecked((prev) => {
      const next = new Set(prev)
      for (const id of soldoutIds) next.delete(id)
      return next
    })
    router.refresh()
  }

  // 합계 — 체크된 항목만
  const selected = useMemo(
    () => items.filter((it) => checked.has(it.id) && !isSoldout(it.product) && it.product),
    [items, checked],
  )
  const subtotal = useMemo(
    () => selected.reduce((sum, it) => sum + (it.product?.price ?? 0) * it.quantity, 0),
    [selected],
  )
  const effectiveShipping = useMemo(() => {
    if (selected.length === 0) return 0
    if (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) return 0
    return shippingFee
  }, [selected.length, subtotal, freeShippingThreshold, shippingFee])
  const totalAmount = subtotal + effectiveShipping

  function handleCheckout() {
    if (selected.length === 0) {
      alert('주문할 상품을 선택해주세요.')
      return
    }
    const ids = selected.map((it) => it.id).join(',')
    router.push(`/checkout?cartItems=${encodeURIComponent(ids)}`)
  }

  function handleBuyRow(item: CartItem) {
    if (isSoldout(item.product) || !item.product) {
      alert('판매가 중지된 상품입니다.')
      return
    }
    router.push(`/checkout?productId=${encodeURIComponent(item.product_id)}&qty=${item.quantity}`)
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-zinc-900">장바구니</h1>
          <span className="text-sm text-zinc-500">0</span>
        </div>
        <div className="rounded-xl bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-zinc-400">장바구니가 비어있습니다.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-zinc-900 hover:underline">
            쇼핑하러 가기 →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-2xl font-bold text-zinc-900">장바구니</h1>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white">
          {items.length}
        </span>
      </div>

      {/* ── 모바일: 전체 선택 + 일괄 액션 (상단) ── */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 shadow-sm md:hidden">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked
            }}
            onChange={(e) => toggleAll(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
          />
          <span>전체 선택</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            선택 삭제
          </button>
          <button
            type="button"
            onClick={handleDeleteSoldout}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            품절 삭제
          </button>
        </div>
      </div>

      {/* 데스크탑 테이블 + 모바일 카드 통합 컨테이너 */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {/* ── 데스크탑 헤더 ── */}
        <div className="hidden grid-cols-[40px_minmax(0,1fr)_140px_180px_120px] items-center gap-3 border-b border-zinc-200 bg-zinc-50/60 px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 md:grid">
          <div className="text-center">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked
              }}
              onChange={(e) => toggleAll(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              aria-label="전체 선택"
            />
          </div>
          <div>상품 정보</div>
          <div className="text-center">수량</div>
          <div className="text-right">주문금액</div>
          <div className="text-center">배송 정보</div>
        </div>

        {/* 행 */}
        <div className="divide-y divide-zinc-100">
          {items.map((item) => {
            const p = item.product
            const soldout = isSoldout(p)
            const isChecked = checked.has(item.id)
            const lineTotal = (p?.price ?? 0) * item.quantity
            return (
              <div
                key={item.id}
                className={soldout ? 'bg-zinc-50/50' : ''}
              >
                {/* ── 데스크탑 행 (md+) ── */}
                <div className="hidden grid-cols-[40px_minmax(0,1fr)_140px_180px_120px] items-center gap-3 px-5 py-5 md:grid">
                  <div className="text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={soldout}
                      onChange={(e) => toggleOne(item.id, e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </div>

                  <div className="flex min-w-0 items-center gap-4">
                    <Link
                      href={p ? `/product/${p.slug || p.id}` : '#'}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200"
                    >
                      {p?.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">없음</div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <Link
                          href={p ? `/product/${p.slug || p.id}` : '#'}
                          className="line-clamp-2 text-sm font-medium text-zinc-900 hover:underline"
                        >
                          {p?.name ?? '(삭제된 상품)'}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          title="삭제"
                          className="ml-auto shrink-0 cursor-pointer text-zinc-400 hover:text-red-500"
                          aria-label="이 항목 삭제"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {soldout && (
                        <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-200">
                          품절/판매중지
                        </span>
                      )}
                      {!soldout && (
                        <QuantityStepper
                          value={item.quantity}
                          onChange={(n) => setQuantityLocal(item.id, n)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-900">{item.quantity}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">옵션/수량 변경</p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-zinc-900">{lineTotal.toLocaleString()}원</p>
                    <button
                      type="button"
                      onClick={() => handleBuyRow(item)}
                      disabled={soldout}
                      className="mt-2 cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      바로구매
                    </button>
                  </div>

                  <div className="text-center text-sm text-zinc-700">
                    <p className="font-medium">{shippingFee.toLocaleString()}원</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">택배</p>
                  </div>
                </div>

                {/* ── 모바일 행 카드 (md 미만) ── */}
                <div className="md:hidden">
                  <div className="flex items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={soldout}
                      onChange={(e) => toggleOne(item.id, e.target.checked)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <Link
                      href={p ? `/product/${p.slug || p.id}` : '#'}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200"
                    >
                      {p?.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">없음</div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <Link
                          href={p ? `/product/${p.slug || p.id}` : '#'}
                          className="line-clamp-2 text-sm font-medium text-zinc-900 hover:underline"
                        >
                          {p?.name ?? '(삭제된 상품)'}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          title="삭제"
                          className="ml-auto shrink-0 cursor-pointer text-zinc-400 hover:text-red-500"
                          aria-label="이 항목 삭제"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {soldout && (
                        <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-200">
                          품절/판매중지
                        </span>
                      )}
                      <p className="mt-1 text-sm font-bold text-zinc-900">{(p?.price ?? 0).toLocaleString()}원</p>
                    </div>
                  </div>

                  {!soldout && (
                    <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(n) => setQuantityLocal(item.id, n)}
                      />
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">합계</p>
                        <p className="text-sm font-bold text-zinc-900">{lineTotal.toLocaleString()}원</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-xs">
                    <span className="text-zinc-500">
                      배송비 <span className="font-medium text-zinc-900">{shippingFee.toLocaleString()}원</span>
                      <span className="ml-1 text-zinc-400">· 택배</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBuyRow(item)}
                      disabled={soldout}
                      className="cursor-pointer rounded-full bg-zinc-900 px-3.5 py-1.5 font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      바로구매
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── 데스크탑 일괄 액션 ── */}
        <div className="hidden items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 md:flex">
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            선택 삭제
          </button>
          <button
            type="button"
            onClick={handleDeleteSoldout}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            품절 삭제
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="ml-auto cursor-pointer text-xs text-zinc-500 hover:text-red-500"
          >
            전체 삭제
          </button>
        </div>
      </div>

      {/* 합계 */}
      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm md:p-6">
        <p className="mb-4 text-sm text-zinc-600">
          총 주문 상품 <span className="font-semibold text-zinc-900">{selected.length}</span>개
        </p>
        <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 md:gap-x-6">
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-900 md:text-xl">{subtotal.toLocaleString()}원</p>
            <p className="mt-0.5 text-[10px] text-zinc-400 md:text-xs">상품금액</p>
          </div>
          <span className="text-xl text-zinc-300 md:text-2xl">+</span>
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-900 md:text-xl">{effectiveShipping.toLocaleString()}원</p>
            <p className="mt-0.5 text-[10px] text-zinc-400 md:text-xs">배송비</p>
          </div>
          <span className="text-xl text-zinc-300 md:text-2xl">=</span>
          <div className="text-center">
            <p className="text-xl font-bold text-zinc-900 md:text-2xl">{totalAmount.toLocaleString()}원</p>
            <p className="mt-0.5 text-[10px] text-zinc-400 md:text-xs">총 주문금액</p>
          </div>
        </div>
        {effectiveShipping === 0 && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold && (
          <p className="mt-3 text-center text-xs text-emerald-600">
            {freeShippingThreshold.toLocaleString()}원 이상 무료배송이 적용되었습니다.
          </p>
        )}
      </div>

      {/* 주문하기 — 라운드 + 그림자 + 큰 패딩 */}
      <button
        type="button"
        onClick={handleCheckout}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-4 text-base font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/15 md:py-5 md:text-lg"
      >
        <span>주문하기</span>
        {selected.length > 0 && (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-2 text-xs font-semibold">
            {selected.length}
          </span>
        )}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 계속 쇼핑하기 — 텍스트 링크 */}
      <div className="mt-3 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          계속 쇼핑하기
        </Link>
      </div>
    </div>
  )
}

function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white">
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="수량 감소"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
        className="w-10 border-x border-zinc-200 py-1 text-center text-sm text-zinc-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="수량 증가"
      >
        +
      </button>
    </div>
  )
}
