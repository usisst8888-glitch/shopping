import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteConfig } from '@/lib/site'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
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
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      url: canonicalUrl,
    },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, level, parent_id')
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  if (!category) notFound()

  // 하위 카테고리 포함: 현재 카테고리 + 자식 카테고리 ID 수집
  const { data: children } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('parent_id', category.id)
    .order('sort_order')

  const categoryIds = [category.id, ...(children ?? []).map((c) => c.id)]

  const { data: relations } = await supabase
    .from('product_categories')
    .select('product_id')
    .in('category_id', categoryIds)

  const productIds = [...new Set((relations ?? []).map((r) => r.product_id))]

  let products: {
    id: string
    name: string
    slug: string | null
    price: number
    thumbnail_url: string | null
  }[] = []

  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, price, thumbnail_url')
      .in('id', productIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    products = data ?? []
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

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-zinc-400">이 카테고리에 등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug || product.id}`}
              className="group overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-52 items-center justify-center bg-zinc-100">
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
                <p className="text-sm font-medium text-zinc-900 group-hover:underline">
                  {product.name}
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-900">
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
