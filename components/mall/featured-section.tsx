import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function FeaturedSection() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!products || products.length === 0) return null

  return (
    <section className="bg-zinc-50 py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">
          인기 상품
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug || product.id}`}
              className="group overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-48 items-center justify-center bg-zinc-100">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">이미지 준비중</span>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-zinc-900 group-hover:underline">
                  {product.name}
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-900">
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
