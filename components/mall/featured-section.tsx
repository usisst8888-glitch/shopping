import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function FeaturedSection({
  categoryId,
  label,
}: {
  categoryId: string
  label: string
}) {
  const supabase = await createClient()

  // 2차 + 3차 하위 카테고리 모두 포함
  const { data: level2 } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', categoryId)

  const level2Ids = (level2 ?? []).map((c) => c.id)

  let level3Ids: string[] = []
  if (level2Ids.length > 0) {
    const { data: level3 } = await supabase
      .from('categories')
      .select('id')
      .in('parent_id', level2Ids)
    level3Ids = (level3 ?? []).map((c) => c.id)
  }

  const catIds = [categoryId, ...level2Ids, ...level3Ids]

  const { data: relations } = await supabase
    .from('product_categories')
    .select('product_id')
    .in('category_id', catIds)

  const productIds = [...new Set((relations ?? []).map((r) => r.product_id))]
  if (productIds.length === 0) return null

  const { data: catData } = await supabase
    .from('categories')
    .select('slug')
    .eq('id', categoryId)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url')
    .in('id', productIds.slice(0, 100))
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!products || products.length === 0) return null

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6">
          <h2 className="w-full cursor-pointer text-[17px] font-bold text-zinc-900">{label}</h2>
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
                <p className="text-sm text-zinc-900 line-clamp-1">{product.name}</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{product.price.toLocaleString()}원</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href={`/category/${catData?.slug || categoryId}`}
            className="inline-block rounded-[9px] border border-[#2c2c2c] px-5 py-2 text-[14px] text-[#2c2c2c]"
          >
            더보기
          </Link>
        </div>
      </div>
    </section>
  )
}
