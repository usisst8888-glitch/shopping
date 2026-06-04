import Link from 'next/link'
import type { CategoryCard } from '@/lib/types/design'

export function CardBannerSection({
  cards,
  cardHeight = 100,
}: {
  cards?: CategoryCard[]
  cardHeight?: number
}) {
  if (!cards || cards.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 my-10">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-5">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href || '/'}
            className="flex flex-col items-center gap-2 sm:flex-1 sm:min-w-0"
          >
            <div
              className="w-full overflow-hidden rounded-lg bg-zinc-100"
              style={{ height: `${cardHeight}px` }}
            >
              {card.image ? (
                <img src={card.image} alt={card.text} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">{card.text.slice(0, 2)}</div>
              )}
            </div>
            <span className="text-[12px] sm:text-[13px] text-center leading-tight text-zinc-600">
              {card.text}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
