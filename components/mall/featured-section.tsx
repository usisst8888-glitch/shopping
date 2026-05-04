import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function FeaturedSection() {
  const supabase = await createClient()

  // 카테고리 관리에서 등록된 1차 카테고리 자동으로 가져오기
  const { data: level1Categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('level', 1)
    .order('sort_order')

  if (!level1Categories || level1Categories.length === 0) return null

  // 각 카테고리별 최신 상품 가져오기
  const sections = await Promise.all(
    level1Categories.map(async (cat) => {
      // 하위 카테고리 포함
      const { data: children } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', cat.id)

      const catIds = [cat.id, ...(children ?? []).map((c) => c.id)]

      const { data: relations } = await supabase
        .from('product_categories')
        .select('product_id')
        .in('category_id', catIds)

      const productIds = [...new Set((relations ?? []).map((r) => r.product_id))]
      if (productIds.length === 0) return { ...cat, products: [] }

      const { data: products } = await supabase
        .from('products')
        .select('id, name, slug, price, thumbnail_url')
        .in('id', productIds.slice(0, 100))
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8)

      return { ...cat, products: products ?? [] }
    })
  )

  return (
    <>
      {sections.map((section) => {
        if (section.products.length === 0) return null
        return (
          <section key={section.id} className="py-12">
            <div className="mx-auto max-w-7xl px-4">
              <div className="mb-6">
                <h2 className="w-full cursor-pointer text-[17px] font-bold text-zinc-900">{section.name}</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
                {section.products.map((product) => (
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
                  href={`/category/${section.slug || section.id}`}
                  className="inline-block rounded-[9px] border border-[#2c2c2c] px-5 py-2 text-[14px] text-[#2c2c2c]"
                >
                  더보기
                </Link>
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
