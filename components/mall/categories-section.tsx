import Link from 'next/link'
import type { CategoryCard } from '@/lib/types/design'

const gradients = [
  'from-amber-100 to-amber-200',
  'from-slate-100 to-slate-200',
  'from-rose-100 to-rose-200',
  'from-emerald-100 to-emerald-200',
  'from-sky-100 to-sky-200',
  'from-violet-100 to-violet-200',
]

export function CategoriesSection({
  cards,
}: {
  cards?: CategoryCard[]
}) {
  if (!cards || cards.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card, i) => (
          <Link
            key={card.id}
            href={card.href || '/'}
            className={`group relative flex h-32 items-center justify-center overflow-hidden rounded-xl ${
              card.image ? '' : `bg-gradient-to-br ${gradients[i % gradients.length]}`
            } text-sm font-medium transition hover:scale-105`}
          >
            {card.image ? (
              <>
                <img
                  src={card.image}
                  alt={card.text}
                  className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/30" />
                <span className="relative text-white drop-shadow-sm">{card.text}</span>
              </>
            ) : (
              <span className="text-zinc-700">{card.text}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
