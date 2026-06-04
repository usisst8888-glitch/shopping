'use client'

import { useEffect, useRef, useState } from 'react'

// 게시물 본문 HTML 렌더 + 이미지 클릭 시 라이트박스
export function PostContentLightbox({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const imgs = Array.from(ref.current.querySelectorAll('img')) as HTMLImageElement[]
    const handlers: { img: HTMLImageElement; fn: (e: MouseEvent) => void }[] = []
    imgs.forEach((img) => {
      img.style.cursor = 'zoom-in'
      const fn = (e: MouseEvent) => {
        e.preventDefault()
        setOpen(img.currentSrc || img.src)
      }
      img.addEventListener('click', fn)
      handlers.push({ img, fn })
    })
    return () => handlers.forEach(({ img, fn }) => img.removeEventListener('click', fn))
  }, [html])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <div ref={ref} className="prose max-w-none text-zinc-700" dangerouslySetInnerHTML={{ __html: html }} />
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
            aria-label="닫기"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
