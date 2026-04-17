import Link from 'next/link'
import type { SiteDesign } from '@/lib/types/design'

export function HeroDefault({
  design,
  siteName,
  description,
}: {
  design: SiteDesign | null
  siteName: string
  description: string | null
}) {
  const title = design?.hero_title ?? description ?? '최상급 명품 레플리카'
  const subtitle =
    design?.hero_subtitle ??
    '합리적인 가격으로 만나는 프리미엄 품질. 디테일 하나하나에 정성을 담았습니다.'
  const ctaText = design?.hero_cta_text ?? '쇼핑하기'
  const ctaLink = design?.hero_cta_link ?? '/'
  const bgColor = design?.hero_bg_color ?? '#18181b'

  return (
    <section className="relative text-white" style={{ backgroundColor: bgColor }}>
      <div className="mx-auto flex min-h-[480px] max-w-7xl flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-sm tracking-widest text-zinc-400">
          PREMIUM QUALITY REPLICA
        </p>
        <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
          {title}
        </h1>
        <p className="mb-8 max-w-lg text-zinc-400">{subtitle}</p>
        <Link
          href={ctaLink}
          className="rounded-full bg-white px-8 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  )
}
