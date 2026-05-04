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

  // 해당 카테고리 + 하위 카테고리의 category_no 수집
  const { data: self } = await supabase
    .from('categories')
    .select('category_no, slug')
    .eq('id', categoryId)
    .single()

  const { data: level2 } = await supabase
    .from('categories')
    .select('id, category_no')
    .eq('parent_id', categoryId)

  const level2Ids = (level2 ?? []).map((c) => c.id)

  let level3Nos: string[] = []
  if (level2Ids.length > 0) {
    const { data: level3 } = await supabase
      .from('categories')
      .select('category_no')
      .in('parent_id', level2Ids)
    level3Nos = (level3 ?? []).map((c) => c.category_no).filter(Boolean) as string[]
  }

  // 모든 category_no 수집
  const allNos = [
    self?.category_no,
    ...(level2 ?? []).map((c) => c.category_no),
    ...level3Nos,
  ].filter(Boolean) as string[]

  if (allNos.length === 0) return null

  // category_nos 배열에 해당 번호가 포함된 상품 조회
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url')
    .overlaps('category_nos', allNos)
    .eq('is_active', true)
    .order('product_no', { ascending: false, nullsFirst: false })
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
            href={`/category/${self?.slug || categoryId}`}
            className="inline-block rounded-[9px] border border-[#2c2c2c] px-5 py-2 text-[14px] text-[#2c2c2c]"
          >
            더보기
          </Link>
        </div>
      </div>
    </section>
  )
}
