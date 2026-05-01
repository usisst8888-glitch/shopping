'use client'

import { useState } from 'react'
import { addToCart } from '@/app/(mall)/cart/actions'

export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false)

  async function handleClick() {
    const result = await addToCart(productId)
    if (result.error) {
      alert(result.error)
    } else {
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      {added ? '추가됨' : '장바구니'}
    </button>
  )
}
