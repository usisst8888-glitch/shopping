import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteConfig } from '@/lib/site'
import { CategoryProductList } from '@/components/mall/category-product-list'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const supabase = await createClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data: category } = await supabase
    .from('categories')
    .select('name, slug')
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  const site = await getSiteConfig()
  const title = category?.name ?? '카테고리'
  const slug = category?.slug || id
  const canonicalUrl = `https://${site.domain}/category/${slug}`

  return {
    title,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, url: canonicalUrl },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const requestedPage = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, category_no, level, parent_id, banner_url, banner_video_url, banner_show_overlay')
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  if (!category) notFound()

  // 1차 카테고리를 찾기 (2차→부모, 3차→부모의 부모)
  let rootCategory = category
  if (category.level === 2 && category.parent_id) {
    const { data: parent } = await supabase
      .from('categories')
      .select('id, name, slug, category_no, banner_url, banner_video_url, banner_show_overlay')
      .eq('id', category.parent_id)
      .single()
    if (parent) rootCategory = { ...parent, level: 1, parent_id: null }
  } else if (category.level === 3 && category.parent_id) {
    // 3차 → 2차 부모 찾기 → 1차 부모 찾기
    const { data: parent2 } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('id', category.parent_id)
      .single()
    if (parent2?.parent_id) {
      const { data: parent1 } = await supabase
        .from('categories')
        .select('id, name, slug, category_no, banner_url, banner_video_url, banner_show_overlay')
        .eq('id', parent2.parent_id)
        .single()
      if (parent1) rootCategory = { ...parent1, level: 1, parent_id: null }
    }
  }

  // 2차 카테고리 (1차의 하위)
  const { data: subCategories } = await supabase
    .from('categories')
    .select('id, name, slug, category_no, image_url')
    .eq('parent_id', rootCategory.id)
    .order('sort_order')

  // 3차 카테고리 (2차 선택 시 → 그 하위, 3차 선택 시 → 부모 2차의 하위)
  const thirdParentId = category.level === 2 ? category.id : (category.level === 3 ? category.parent_id : null)
  let thirdCategories: { id: string; name: string; slug: string | null; category_no: string | null }[] = []
  if (thirdParentId) {
    const { data: tc } = await supabase
      .from('categories')
      .select('id, name, slug, category_no')
      .eq('parent_id', thirdParentId)
      .order('sort_order')
    thirdCategories = tc ?? []
  }

  // 현재 선택된 카테고리의 하위 + 자기 자신의 category_no 수집
  const { data: children } = await supabase
    .from('categories')
    .select('id, category_no')
    .eq('parent_id', category.id)

  const childIds = (children ?? []).map((c) => c.id)
  let grandChildNos: string[] = []
  if (childIds.length > 0) {
    const { data: gc } = await supabase.from('categories').select('category_no').in('parent_id', childIds)
    grandChildNos = (gc ?? []).map((c) => c.category_no).filter(Boolean) as string[]
  }

  const allNos = [
    category.category_no,
    ...(children ?? []).map((c) => c.category_no),
    ...grandChildNos,
  ].filter(Boolean) as string[]

  let initialProducts: { id: string; name: string; slug: string | null; price: number; thumbnail_url: string | null }[] = []
  let total = 0

  // 카테고리 페이징 설정 (없으면 기본값)
  const paginationMode: 'load_more' | 'pages' =
    (category as { pagination_mode?: 'load_more' | 'pages' }).pagination_mode ?? 'load_more'
  const productsPerRow = (category as { products_per_row?: number }).products_per_row ?? 4
  const productsRows = (category as { products_rows?: number }).products_rows ?? 10
  const pageSize = Math.max(1, productsPerRow * productsRows)
  const page = paginationMode === 'pages' ? requestedPage : 1
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (allNos.length > 0) {
    const { data, count } = await supabase
      .from('products')
      .select('id, name, slug, price, thumbnail_url', { count: 'exact' })
      .overlaps('category_nos', allNos)
      .eq('is_active', true)
      .order('product_no', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    initialProducts = data ?? []
    total = count ?? 0
  }

  // 카테고리 배너 (해당 카테고리에 설정된 배너 우선, 없으면 1차 카테고리 배너로 폴백)
  // 오버레이(텍스트·버튼) 표시 여부는 배너를 제공한 카테고리의 설정을 따른다.
  const bannerSource = (category.banner_video_url || category.banner_url) ? category : rootCategory
  const bannerUrl: string | null = bannerSource.banner_url ?? null
  const bannerVideoUrl: string | null = bannerSource.banner_video_url ?? null
  const showBannerOverlay: boolean = bannerSource.banner_show_overlay ?? true

  return (
    <div>
      {/* 배너 */}
      {bannerVideoUrl ? (
        <div className="relative mx-auto max-w-[1920px]">
          <div className="relative h-[200px] md:h-[450px] overflow-hidden">
            <video
              src={bannerVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
            {showBannerOverlay && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-6 md:gap-8">
                <div className="flex flex-col items-center">
                  <span className="text-5xl md:text-8xl text-white tracking-widest" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>HIGH-END</span>
                  <span className="text-2xl md:text-4xl text-white tracking-[0.5em] md:tracking-[0.55em]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>MYEONGPLE</span>
                </div>
                <div className="flex gap-3 md:gap-4">
                  <Link href="/board/process" className="bg-black border border-white/30 px-10 py-2.5 md:px-16 md:py-3 text-sm md:text-base text-white tracking-wider hover:bg-zinc-800 transition">제작과정</Link>
                  <Link href="/board/review" className="bg-black border border-white/30 px-10 py-2.5 md:px-16 md:py-3 text-sm md:text-base text-white tracking-wider hover:bg-zinc-800 transition">구매후기</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : bannerUrl ? (
        <div className="relative mx-auto max-w-[1920px]">
          <div className="h-[200px] md:h-[450px] overflow-hidden">
            <img src={bannerUrl} alt="카테고리 배너" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}

      {/* 2차 카테고리 이미지 썸네일 */}
      {subCategories && subCategories.length > 0 && (
        <div className="bg-white py-6">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 sm:gap-5">
              {subCategories.map((sub) => {
                const isActive = sub.id === category.id || (category.level === 3 && category.parent_id === sub.id)
                const hasImage = !!sub.image_url

                if (!hasImage) {
                  return (
                    <Link
                      key={sub.id}
                      href={`/category/${sub.slug || sub.id}`}
                      className={`flex items-center justify-center rounded-lg border px-3 py-3 text-center text-[13px] transition ${
                        isActive
                          ? 'border-zinc-900 bg-zinc-900 font-bold text-white'
                          : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50'
                      }`}
                    >
                      {sub.name}
                    </Link>
                  )
                }

                return (
                  <Link
                    key={sub.id}
                    href={`/category/${sub.slug || sub.id}`}
                    className={`flex flex-col items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-zinc-100">
                      <img src={sub.image_url} alt={sub.name} className="h-full w-full object-cover" />
                    </div>
                    <span className={`text-[13px] text-center leading-tight ${isActive ? 'font-bold text-zinc-900' : 'text-zinc-600'}`}>
                      {sub.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3차 카테고리 그리드 */}
      {thirdCategories.length > 0 && (
        <div className="bg-white">
          <div className="mx-auto max-w-5xl px-4 pb-4">
            {(() => {
              const allItems = [
                { id: 'show-all', name: 'Show All', href: `/category/${(category.level === 3 && category.parent_id) ? category.parent_id : (category.slug || category.id)}`, isActive: false },
                ...thirdCategories.map((tc) => ({ id: tc.id, name: tc.name, href: `/category/${tc.slug || tc.id}`, isActive: tc.id === category.id })),
              ]
              const rows: typeof allItems[] = []
              for (let i = 0; i < allItems.length; i += 4) {
                rows.push(allItems.slice(i, i + 4))
              }
              return (
                <div className="border-t border-l border-zinc-200">
                  {rows.map((row, ri) => (
                    <div key={ri} className="flex">
                      {row.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex-1 border-b border-r border-zinc-200 px-4 py-3 text-center text-[13px] hover:bg-zinc-50 ${
                            item.isActive ? 'font-bold text-zinc-900' : 'text-zinc-700'
                          }`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* 상품 그리드 */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">총 {total.toLocaleString()}개</p>
        </div>

        <CategoryProductList
          initialProducts={initialProducts}
          categoryNos={allNos}
          total={total}
          fromCategoryId={category.id}
          paginationMode={paginationMode}
          perRow={productsPerRow}
          rows={productsRows}
          page={page}
        />
      </div>
    </div>
  )
}
