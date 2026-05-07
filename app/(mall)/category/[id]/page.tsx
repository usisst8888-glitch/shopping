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
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, category_no, level, parent_id, banner_url, banner_title')
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  if (!category) notFound()

  // 1차 카테고리를 찾기 (2차→부모, 3차→부모의 부모)
  let rootCategory = category
  if (category.level === 2 && category.parent_id) {
    const { data: parent } = await supabase
      .from('categories')
      .select('id, name, slug, category_no, banner_url, banner_title')
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
        .select('id, name, slug, category_no, banner_url, banner_title')
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

  let initialProducts: any[] = []
  let total = 0

  if (allNos.length > 0) {
    const { data, count } = await supabase
      .from('products')
      .select('id, name, slug, price, thumbnail_url', { count: 'exact' })
      .overlaps('category_nos', allNos)
      .eq('is_active', true)
      .order('product_no', { ascending: false, nullsFirst: false })
      .range(0, 39)

    initialProducts = data ?? []
    total = count ?? 0
  }

  const bannerUrl = rootCategory.banner_url || category.banner_url
  const bannerTitle = rootCategory.banner_title || category.banner_title || rootCategory.name

  return (
    <div>
      {/* 배너 */}
      {bannerUrl ? (
        <div className="relative mx-auto max-w-[1920px]">
          <div className="relative h-[200px] md:h-[300px] overflow-hidden">
            <img src={bannerUrl} alt={bannerTitle} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <h1 className="text-3xl font-bold tracking-wider text-white md:text-5xl">{bannerTitle}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 py-12 text-center">
          <h1 className="text-3xl font-bold tracking-wider text-white md:text-4xl">{bannerTitle}</h1>
        </div>
      )}

      {/* 2차 카테고리 이미지 썸네일 */}
      {subCategories && subCategories.length > 0 && (
        <div className="bg-white py-6">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
              {subCategories.map((sub) => {
                const isActive = sub.id === category.id || (category.level === 3 && category.parent_id === sub.id)
                return (
                  <Link
                    key={sub.id}
                    href={`/category/${sub.slug || sub.id}`}
                    className={`flex flex-col items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <div className={`h-16 w-16 overflow-hidden rounded-full border-2 ${isActive ? 'border-zinc-900' : 'border-zinc-200'} bg-zinc-100`}>
                      {sub.image_url ? (
                        <img src={sub.image_url} alt={sub.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">{sub.name.slice(0, 2)}</div>
                      )}
                    </div>
                    <span className={`text-[11px] text-center ${isActive ? 'font-bold text-zinc-900' : 'text-zinc-500'}`}>
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
            <div className="grid grid-cols-4 border border-zinc-200">
              <Link
                href={`/category/${(category.level === 3 && category.parent_id) ? category.parent_id : (category.slug || category.id)}`}
                className="border-b border-r border-zinc-200 px-4 py-3 text-center text-[13px] text-zinc-700 hover:bg-zinc-50"
              >
                Show All
              </Link>
              {thirdCategories.map((tc) => (
                <Link
                  key={tc.id}
                  href={`/category/${tc.slug || tc.id}`}
                  className={`border-b border-r border-zinc-200 px-4 py-3 text-center text-[13px] hover:bg-zinc-50 ${
                    tc.id === category.id ? 'font-bold text-zinc-900' : 'text-zinc-700'
                  }`}
                >
                  {tc.name}
                </Link>
              ))}
            </div>
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
        />
      </div>
    </div>
  )
}
