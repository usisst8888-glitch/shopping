import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function FeaturedSection({
  categoryId,
  label,
}: {
  categoryId?: string | null
  label?: string
}) {
  const supabase = await createClient()

  if (categoryId) {
    // 해당 카테고리 + 하위 카테고리 ID 수집
    const { data: children } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', categoryId)

    const allCatIds = [categoryId, ...(children ?? []).map((c) => c.id)]

    // 해당 카테고리들의 상품 ID
    const { data: relations } = await supabase
      .from('product_categories')
      .select('product_id')
      .in('category_id', allCatIds)

    const productIds = [...new Set((relations ?? []).map((r) => r.product_id))]
    if (productIds.length === 0) return null

    // 최신 8개만
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, price, thumbnail_url')
      .in('id', productIds.slice(0, 100))
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (!products || products.length === 0) return null

    return <ProductGrid products={products} label={label} categoryId={categoryId} />
  }

  // 카테고리 미지정 시 전체 최신 상품
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!products || products.length === 0) return null

  return <ProductGrid products={products} label={label} />
}

function ProductGrid({
  products,
  label,
  categoryId,
}: {
  products: { id: string; name: string; slug: string | null; price: number; thumbnail_url: string | null }[]
  label?: string
  categoryId?: string
}) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900">{label || '인기 상품'}</h2>
          {categoryId && (
            <Link
              href={`/category/${categoryId}`}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              전체보기
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug || product.id}`}
              className="group"
            >
              <div className="aspect-square overflow-hidden bg-zinc-100">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    className="w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 준비중</div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-sm text-zinc-900 line-clamp-1">
                  {product.name}
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-900">
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
