import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSiteConfig } from '@/lib/site'
import { ProductGallery } from '@/components/mall/product-gallery'
import { AddToCartButton } from '@/components/mall/add-to-cart-button'
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
  const { data: product } = await supabase
    .from('products')
    .select('name, slug, summary, thumbnail_url')
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  const site = await getSiteConfig()
  const slug = product?.slug || id
  const canonicalUrl = `https://${site.domain}/product/${slug}`
  const title = product?.name ?? '상품'
  const description = product?.summary?.replace(/<[^>]*>/g, '').slice(0, 160) ?? ''

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      ...(product?.thumbnail_url ? { images: [{ url: product.thumbnail_url }] } : {}),
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq(isUuid ? 'id' : 'slug', id)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  const { data: relations } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', product.id)

  let categories: { id: string; name: string; slug: string | null }[] = []
  if (relations && relations.length > 0) {
    const catIds = relations.map((r) => r.category_id)
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('id', catIds)
    categories = data ?? []
  }

  const allImages = [
    ...(product.thumbnail_url ? [product.thumbnail_url] : []),
    ...((product.sub_images as string[]) ?? []),
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* 이미지 갤러리 */}
        <div>
          <ProductGallery images={allImages} productName={product.name} />
        </div>

        {/* 상품 정보 */}
        <div>
          {categories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug || cat.id}`}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-200"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>

          <p className="mt-4 text-3xl font-bold text-zinc-900">
            {product.price.toLocaleString()}원
          </p>

          {product.summary && (
            <div
              className="mt-6 text-sm leading-relaxed text-zinc-600"
              dangerouslySetInnerHTML={{ __html: product.summary }}
            />
          )}

          <div className="mt-8 flex gap-3">
            <button className="flex-1 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800">
              구매하기
            </button>
            <AddToCartButton productId={product.id} />
          </div>
        </div>
      </div>

      {/* 상세 설명 */}
      {product.description && (
        <div className="mt-16 border-t border-zinc-200 pt-12">
          <h2 className="mb-6 text-lg font-bold text-zinc-900">상세 정보</h2>
          <div
            className="prose max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  )
}
