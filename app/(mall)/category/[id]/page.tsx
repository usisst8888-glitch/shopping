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
    .select('id, name, slug, category_no, level, parent_id')
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  if (!category) notFound()

  const { data: children } = await supabase
    .from('categories')
    .select('id, name, slug, category_no')
    .eq('parent_id', category.id)
    .order('sort_order')

  const childIds = (children ?? []).map((c) => c.id)
  let grandChildNos: string[] = []
  if (childIds.length > 0) {
    const { data: grandChildren } = await supabase
      .from('categories')
      .select('category_no')
      .in('parent_id', childIds)
    grandChildNos = (grandChildren ?? []).map((c) => c.category_no).filter(Boolean) as string[]
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">{category.name}</h1>

      {children && children.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={`/category/${category.slug || category.id}`}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white"
          >
            전체
          </Link>
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug || child.id}`}
              className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <CategoryProductList
        initialProducts={initialProducts}
        categoryNos={allNos}
        total={total}
      />
    </div>
  )
}
