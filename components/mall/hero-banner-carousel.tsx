'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Banner } from '@/lib/types/design'

export function HeroBannerCarousel({ banners, autoSeconds }: { banners: Banner[]; autoSeconds?: number }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    // 미설정(undefined)이면 5초, 0이면 자동 넘김 끔
    const ms = autoSeconds === undefined ? 5000 : autoSeconds * 1000
    if (ms <= 0) return
    const timer = setInterval(next, ms)
    return () => clearInterval(timer)
  }, [banners.length, paused, next, autoSeconds])

  if (banners.length === 0) return null

  const banner = banners[current]

  return (
    <section
      className="relative mx-auto max-w-[1920px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full">
        {banners.map((b, index) => (
          <div
            key={b.id}
            className={`${index === 0 ? 'relative' : 'absolute inset-0'} transition-opacity duration-700 ${
              index === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* 모바일 이미지 */}
            {b.mobile_image_url && (
              <img
                src={b.mobile_image_url}
                alt={b.title ?? '배너'}
                className="w-full md:hidden"
              />
            )}
            {/* 데스크탑 이미지 */}
            <img
              src={b.image_url}
              alt={b.title ?? '배너'}
              className={`w-full ${b.mobile_image_url ? 'hidden md:block' : ''}`}
            />
          </div>
        ))}

        {/* 배너 클릭 링크 */}
        {banner.link_url && (
          <Link href={banner.link_url} className="absolute inset-0 z-[1]" />
        )}
      </div>

      {/* 네비게이션 dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === current
                  ? 'w-8 bg-white'
                  : 'w-2.5 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* 좌우 화살표 */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrent(
                (prev) => (prev - 1 + banners.length) % banners.length
              )
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}
    </section>
  )
}
