'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Banner } from '@/lib/types/design'

export function HeroBannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [banners.length, paused, next])

  if (banners.length === 0) return null

  const banner = banners[current]

  return (
    <section
      className="relative mx-auto max-w-[1920px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[480px] w-full">
        {banners.map((b, index) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* 모바일 이미지 */}
            {b.mobile_image_url && (
              <Image
                src={b.mobile_image_url}
                alt={b.title ?? '배너'}
                fill
                className="object-cover md:hidden"
                priority={index === 0}
              />
            )}
            {/* 데스크탑 이미지 */}
            <Image
              src={b.image_url}
              alt={b.title ?? '배너'}
              fill
              className={`object-cover ${b.mobile_image_url ? 'hidden md:block' : ''}`}
              priority={index === 0}
            />
          </div>
        ))}

        {/* 텍스트 오버레이 */}
        {(banner.title || banner.subtitle || banner.link_url) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-center text-white">
            {banner.title && (
              <h2 className="mb-4 text-3xl font-bold md:text-5xl">
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="mb-6 max-w-lg text-sm text-white/80 md:text-base">
                {banner.subtitle}
              </p>
            )}
            {banner.link_url && (
              <Link
                href={banner.link_url}
                className="rounded-full bg-white px-8 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                {banner.link_text || '자세히 보기'}
              </Link>
            )}
          </div>
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
