import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '검색 결과' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  if (!query) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-zinc-500">검색어를 입력해주세요.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: products, count } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url', { count: 'exact' })
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .order('created_at', { ascending: false })
    .range(0, 39)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">&ldquo;{query}&rdquo; 검색 결과</h1>
      <p className="mb-8 text-sm text-zinc-500">총 {count ?? 0}개</p>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug || product.id}`}
              className="group"
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="mt-2">
                <p className="text-sm text-zinc-900 line-clamp-2">{product.name}</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-zinc-500">검색 결과가 없습니다.</p>
      )}
    </div>
  )
}
