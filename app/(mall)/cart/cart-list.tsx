'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCartQuantity, removeFromCart } from './actions'

type CartItem = {
  id: string
  quantity: number
  product_id: string
  product: {
    id: string
    name: string
    slug: string | null
    price: number
    thumbnail_url: string | null
  } | null
}

export function CartList({ items }: { items: CartItem[] }) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">장바구니가 비어있습니다.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 hover:underline"
        >
          쇼핑하러 가기
        </Link>
      </div>
    )
  }

  const total = items.reduce((sum, item) => {
    return sum + (item.product?.price ?? 0) * item.quantity
  }, 0)

  return (
    <div>
      <div className="divide-y divide-zinc-100">
        {items.map((item) => {
          if (!item.product) return null
          return (
            <div key={item.id} className="flex gap-4 py-6">
              {/* 이미지 */}
              <Link
                href={`/product/${item.product.slug || item.product.id}`}
                className="h-24 w-24 flex-shrink-0 overflow-hidden bg-zinc-100"
              >
                {item.product.thumbnail_url ? (
                  <img
                    src={item.product.thumbnail_url}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">없음</div>
                )}
              </Link>

              {/* 정보 */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/product/${item.product.slug || item.product.id}`}
                    className="text-sm text-zinc-900 hover:underline line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-zinc-900">
                    {item.product.price.toLocaleString()}원
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* 수량 */}
                  <div className="flex items-center border border-zinc-200">
                    <button
                      onClick={async () => {
                        await updateCartQuantity(item.id, item.quantity - 1)
                        router.refresh()
                      }}
                      className="px-2.5 py-1 text-sm text-zinc-500 hover:text-zinc-900"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-sm text-zinc-900">{item.quantity}</span>
                    <button
                      onClick={async () => {
                        await updateCartQuantity(item.id, item.quantity + 1)
                        router.refresh()
                      }}
                      className="px-2.5 py-1 text-sm text-zinc-500 hover:text-zinc-900"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      await removeFromCart(item.id)
                      router.refresh()
                    }}
                    className="text-xs text-zinc-400 hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 소계 */}
              <div className="flex items-center">
                <p className="text-sm font-bold text-zinc-900">
                  {(item.product.price * item.quantity).toLocaleString()}원
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 합계 */}
      <div className="mt-6 border-t border-zinc-900 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-zinc-900">합계</span>
          <span className="text-lg font-bold text-zinc-900">{total.toLocaleString()}원</span>
        </div>
        <button className="mt-6 w-full bg-zinc-900 py-4 text-sm font-medium text-white hover:bg-zinc-800">
          주문하기
        </button>
      </div>
    </div>
  )
}
