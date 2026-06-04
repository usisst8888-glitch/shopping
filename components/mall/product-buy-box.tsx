'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addToCart } from '@/app/(mall)/cart/actions'
import { toggleWishlist } from '@/app/(mall)/product/wishlist-actions'

export function ProductBuyBox({
  productId,
  price,
  initialLiked = false,
  initialLikeCount = 0,
}: {
  productId: string
  price: number
  initialLiked?: boolean
  initialLikeCount?: number
}) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState<null | 'cart' | 'buynow' | 'like'>(null)

  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)

  // 「구매하기」 클릭 시 선택 모달
  const [showChoice, setShowChoice] = useState(false)
  // 장바구니 담은 후 「장바구니 가기 / 계속 쇼핑」 모달
  const [showAddedModal, setShowAddedModal] = useState(false)

  const dec = () => setQuantity((q) => Math.max(1, q - 1))
  const inc = () => setQuantity((q) => Math.min(99, q + 1))
  const onChangeQty = (v: string) => {
    const n = parseInt(v)
    if (!Number.isFinite(n)) setQuantity(1)
    else setQuantity(Math.min(99, Math.max(1, n)))
  }

  async function handleAddToCart() {
    setBusy('cart')
    const r = await addToCart(productId, quantity)
    setBusy(null)
    if (r.error) {
      alert(r.error)
      return
    }
    // 토스트 대신 「장바구니 가기 / 계속 쇼핑」 선택 모달
    setShowAddedModal(true)
  }

  function handleBuyNow() {
    setBusy('buynow')
    router.push(`/checkout?productId=${encodeURIComponent(productId)}&qty=${quantity}`)
  }

  async function handleAddToCartFromModal() {
    setShowChoice(false)
    await handleAddToCart()
  }

  function handleBuyNowFromModal() {
    setShowChoice(false)
    handleBuyNow()
  }

  async function handleToggleLike() {
    setBusy('like')
    // 낙관적 갱신
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c) => c + (wasLiked ? -1 : 1))

    const r = await toggleWishlist(productId)
    setBusy(null)
    if ('error' in r) {
      // 롤백
      setLiked(wasLiked)
      setLikeCount((c) => c + (wasLiked ? 1 : -1))
      alert(r.error)
      return
    }
    // 서버 응답으로 정합성 맞춤
    setLiked(r.liked)
    setLikeCount(r.count)
  }

  const total = price * quantity

  return (
    <div className="mt-8 space-y-4">
      {/* 수량 선택 */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <span className="text-sm font-medium text-zinc-700">수량</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dec}
            disabled={quantity <= 1}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="수량 감소"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => onChangeQty(e.target.value)}
            className="w-12 rounded-md border border-zinc-300 bg-white py-1 text-center text-sm font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={inc}
            disabled={quantity >= 99}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="수량 증가"
          >
            +
          </button>
        </div>
      </div>

      {/* 합계 — 「총 상품금액(N개)」 형태 */}
      <div className="flex items-baseline justify-between border-t border-b border-zinc-100 py-3">
        <span className="text-sm text-zinc-500">총 상품금액<span className="text-zinc-400">({quantity}개)</span></span>
        <span className="text-xl font-bold text-zinc-900">{total.toLocaleString()}원</span>
      </div>

      {/* 액션 버튼 — 구매하기 / 장바구니 / 찜 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowChoice(true)}
          disabled={busy !== null}
          className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy === 'buynow' ? '이동 중...' : '구매하기'}
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={busy !== null}
          className="flex-1 cursor-pointer rounded-lg border border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy === 'cart' ? '담는 중...' : '장바구니'}
        </button>
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={busy !== null}
          aria-label={liked ? '찜 해제' : '찜하기'}
          className={`flex min-w-[80px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition disabled:opacity-50 ${
            liked
              ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <svg
            className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}
            fill={liked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {likeCount}
        </button>
      </div>


      {/* 구매 방식 선택 모달 */}
      {showChoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowChoice(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-3 text-center">
              <h3 className="text-base font-semibold text-zinc-900">어떻게 진행할까요?</h3>
              <p className="mt-1 text-xs text-zinc-500">
                선택한 수량 <span className="font-semibold text-zinc-900">{quantity}개</span> · 합계 <span className="font-semibold text-zinc-900">{total.toLocaleString()}원</span>
              </p>
            </div>
            <div className="space-y-2 px-5 pb-5 pt-2">
              <button
                type="button"
                onClick={handleBuyNowFromModal}
                disabled={busy !== null}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                </svg>
                바로 주문하기
              </button>
              <button
                type="button"
                onClick={handleAddToCartFromModal}
                disabled={busy !== null}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
                장바구니에 담기
              </button>
              <button
                type="button"
                onClick={() => setShowChoice(false)}
                className="mt-1 w-full cursor-pointer py-2 text-xs text-zinc-500 hover:text-zinc-900"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장바구니 담은 후 — 「장바구니로 가기 / 계속 쇼핑」 */}
      {showAddedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAddedModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-zinc-900">장바구니에 담았어요</h3>
              <p className="mt-1 text-xs text-zinc-500">
                선택한 수량 <span className="font-semibold text-zinc-900">{quantity}개</span> 가 장바구니에 추가되었습니다.
              </p>
            </div>
            <div className="space-y-2 px-5 pb-5 pt-1">
              <button
                type="button"
                onClick={() => router.push('/cart')}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
                장바구니로 가기
              </button>
              <button
                type="button"
                onClick={() => setShowAddedModal(false)}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                계속 쇼핑하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
