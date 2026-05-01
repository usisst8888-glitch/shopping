'use client'

import { useState } from 'react'

export function ProductGallery({
  images,
  productName,
}: {
  images: string[]
  productName: string
}) {
  const [selected, setSelected] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-zinc-100 text-zinc-400">
        이미지 준비중
      </div>
    )
  }

  return (
    <div>
      {/* 메인 이미지 */}
      <div className="aspect-square overflow-hidden bg-zinc-100">
        <img
          src={images[selected]}
          alt={productName}
          className="h-full w-full object-cover"
        />
      </div>

      {/* 썸네일 목록 */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden ${
                idx === selected
                  ? 'ring-2 ring-zinc-900'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`${productName} ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
