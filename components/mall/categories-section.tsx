import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const gradients = [
  'from-amber-100 to-amber-200',
  'from-slate-100 to-slate-200',
  'from-rose-100 to-rose-200',
  'from-emerald-100 to-emerald-200',
  'from-sky-100 to-sky-200',
  'from-violet-100 to-violet-200',
]

export async function CategoriesSection() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, image_url')
    .eq('is_main', true)
    .order('sort_order')

  if (!categories || categories.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">
        카테고리
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/category/${cat.id}`}
            className={`group relative flex h-32 items-center justify-center overflow-hidden rounded-xl ${
              cat.image_url ? '' : `bg-gradient-to-br ${gradients[i % gradients.length]}`
            } text-sm font-medium transition hover:scale-105`}
          >
            {cat.image_url ? (
              <>
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/30" />
                <span className="relative text-white drop-shadow-sm">{cat.name}</span>
              </>
            ) : (
              <span className="text-zinc-700">{cat.name}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
