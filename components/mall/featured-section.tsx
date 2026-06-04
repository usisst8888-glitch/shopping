import { createClient } from '@/lib/supabase/server'
import { FeaturedProducts } from './featured-products'

export async function FeaturedSection({
  categoryId,
  label,
  subtitle,
  moreAction = 'link',
  showMoreButton = true,
  display = 'grid',
  perRow = 4,
  rows = 2,
  perRowMobile = 2,
  rowsMobile,
  totalItems,
  sortBy = 'created',
  autoSeconds = 0,
}: {
  categoryId: string
  label: string
  subtitle?: string
  moreAction?: 'link' | 'expand'
  showMoreButton?: boolean
  display?: 'grid' | 'slider'
  perRow?: number
  rows?: number
  perRowMobile?: number
  rowsMobile?: number
  totalItems?: number
  sortBy?: 'created' | 'popular' | 'priceAsc' | 'priceDesc'
  autoSeconds?: number
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

  // 진열 수: totalItems 우선, 없으면 perRow*rows 기본
  const base = Math.max(1, totalItems ?? perRow * rows)
  // 슬라이드/펼치기는 더 가져옴
  const limit = display === 'slider' || moreAction === 'expand' ? Math.max(base, 40) : base

  // 정렬
  let query = supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url')
    .overlaps('category_nos', allNos)
    .eq('is_active', true)

  if (sortBy === 'popular') {
    query = query
      .order('view_count', { ascending: false })
      .order('product_no', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
  } else if (sortBy === 'priceAsc') {
    query = query.order('price', { ascending: true })
  } else if (sortBy === 'priceDesc') {
    query = query.order('price', { ascending: false })
  } else {
    // 등록순 (기본) — product_no 내림차순, 동률은 created_at 내림차순으로 복제본을 원본 위에 노출
    query = query
      .order('product_no', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
  }

  const { data: products } = await query.limit(limit)

  if (!products || products.length === 0) return null

  return (
    <section className="pt-4 pb-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6">
          <h2 className="w-full [&_p]:my-0" dangerouslySetInnerHTML={{ __html: label }} />
          {subtitle && <div className="mt-1 [&_p]:my-0" dangerouslySetInnerHTML={{ __html: subtitle }} />}
        </div>
        <FeaturedProducts
          products={products}
          mode={moreAction}
          showMoreButton={showMoreButton}
          display={display}
          perRow={perRow}
          rows={rows}
          perRowMobile={perRowMobile}
          rowsMobile={rowsMobile ?? rows}
          totalItems={base}
          autoSeconds={autoSeconds}
          categoryHref={`/category/${self?.slug || categoryId}`}
          fromCategoryId={categoryId}
        />
      </div>
    </section>
  )
}
