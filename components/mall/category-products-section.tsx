import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function CategoryProductsSection({
  categoryIds,
}: {
  categoryIds: string[]
}) {
  if (!categoryIds || categoryIds.length === 0) return null

  const supabase = await createClient()

  // 선택된 카테고리 정보 가져오기
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .in('id', categoryIds)

  if (!categories || categories.length === 0) return null

  // 순서 유지
  const sortedCategories = categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as { id: string; name: string; slug: string | null }[]

  // 각 카테고리의 상품 가져오기
  const sections = await Promise.all(
    sortedCategories.map(async (cat) => {
      // 해당 카테고리 + 하위 카테고리의 상품 ID 수집
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
        .in('id', productIds)
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
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">{section.name}</h2>
                <Link
                  href={`/category/${section.slug || section.id}`}
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  전체보기
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {section.products.map((product) => (
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
                      <p className="text-sm font-medium text-zinc-900 group-hover:underline line-clamp-1">
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
      })}
    </>
  )
}
