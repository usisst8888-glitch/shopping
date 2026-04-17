import Image from 'next/image'
import Link from 'next/link'
import type { Banner } from '@/lib/types/design'

export function BannerSection({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null

  if (banners.length === 1) {
    const banner = banners[0]
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="relative overflow-hidden rounded-xl">
          {banner.link_url ? (
            <Link href={banner.link_url} className="block">
              <BannerImage banner={banner} />
            </Link>
          ) : (
            <BannerImage banner={banner} />
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div
        className={`grid gap-4 ${
          banners.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="relative overflow-hidden rounded-xl">
            {banner.link_url ? (
              <Link href={banner.link_url} className="block">
                <BannerImage banner={banner} />
              </Link>
            ) : (
              <BannerImage banner={banner} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function BannerImage({ banner }: { banner: Banner }) {
  return (
    <div className="group relative aspect-[16/5] overflow-hidden">
      <Image
        src={banner.image_url}
        alt={banner.title ?? '배너'}
        fill
        className="object-cover transition group-hover:scale-105"
      />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-center text-white">
          {banner.title && (
            <h3 className="text-xl font-bold md:text-2xl">{banner.title}</h3>
          )}
          {banner.subtitle && (
            <p className="mt-2 text-sm text-white/80">{banner.subtitle}</p>
          )}
          {banner.link_text && (
            <span className="mt-3 text-sm font-medium underline">
              {banner.link_text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
