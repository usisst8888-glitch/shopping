import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSiteConfig, getSiteConfigFull } from '@/lib/site'
import { ProductGallery } from '@/components/mall/product-gallery'
import { ProductBuyBox } from '@/components/mall/product-buy-box'
import { ShareButton } from '@/components/mall/share-button'
import { ScrollToTop } from '@/components/scroll-to-top'
import { formatProductPrice } from '@/lib/format-price'
import type { Metadata } from 'next'

// NEW 뱃지 — 등록 후 14일 이내
function checkIsNew(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return false
  return (new Date().getTime() - created) < 14 * 24 * 60 * 60 * 1000
}

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
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

  // 브레드크럼: 사용자가 타고 들어온 카테고리(?cat=) 경로 우선, 없으면 상품의 가장 깊은 카테고리로 폴백
  const sp = await searchParams
  const fromCatId = typeof sp.cat === 'string' ? sp.cat : undefined
  const breadcrumb: { id: string; name: string; slug: string | null }[] = []
  const { data: allCats } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, level')
  if (allCats) {
    const byId = new Map(allCats.map((c) => [c.id, c]))
    let cur = fromCatId ? byId.get(fromCatId) : undefined
    if (!cur && relations && relations.length > 0) {
      const catIds = relations.map((r) => r.category_id)
      const productCats = allCats.filter((c) => catIds.includes(c.id))
      cur = productCats.sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0]
    }
    const guard = new Set<string>()
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id)
      breadcrumb.unshift({ id: cur.id, name: cur.name, slug: cur.slug })
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
    }
  }

  const allImages = [
    ...(product.thumbnail_url ? [product.thumbnail_url] : []),
    ...((product.sub_images as string[]) ?? []),
  ]

  const siteConfig = await getSiteConfigFull()
  const topHtml = siteConfig.design?.product_detail_top_html
  const bottomHtml = siteConfig.design?.product_detail_bottom_html

  // 결제·배송·포인트 정책
  const { data: siteRow } = await supabase
    .from('sites')
    .select('shipping_fee, free_shipping_threshold, point_earn_rate')
    .limit(1)
    .single()
  const shippingFee = siteRow?.shipping_fee ?? 0
  const freeShippingThreshold = siteRow?.free_shipping_threshold ?? 0
  const pointEarnRate = siteRow?.point_earn_rate ?? 0
  const expectedPoints = Math.floor((product.price * pointEarnRate) / 100)

  // 찜 카운트 + 본인 찜 여부
  const { count: wishlistCount } = await supabase
    .from('wishlists')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', product.id)
  let initialLiked = false
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    const { data: mine } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('product_id', product.id)
      .maybeSingle()
    initialLiked = !!mine
  }

  const isNew = checkIsNew(product.created_at)

  const sharePath = `/product/${product.slug || product.id}`

  return (
    <div>
      <ScrollToTop />
      {/* 상단 카테고리 경로 (브레드크럼) */}
      {breadcrumb.length > 0 && (
        <nav className="bg-white">
          <div className="mx-auto max-w-7xl px-4 pt-4 pb-1">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-zinc-500">
              <li>
                <Link href="/" className="hover:text-zinc-900">Home</Link>
              </li>
              {breadcrumb.map((c, i) => (
                <li key={c.id} className="flex items-center gap-x-1.5">
                  <span className="text-zinc-300">›</span>
                  <Link
                    href={`/category/${c.slug || c.id}`}
                    className={i === breadcrumb.length - 1 ? 'font-medium text-zinc-900' : 'hover:text-zinc-900'}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-7xl px-4 pt-2 pb-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* 이미지 갤러리 */}
        <div>
          <ProductGallery images={allImages} productName={product.name} />
        </div>

        {/* 상품 정보 */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="flex-1 text-2xl font-bold text-zinc-900">
              {product.name}
              {isNew && (
                <span className="ml-2 inline-block align-middle rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
                  NEW
                </span>
              )}
            </h1>
            <ShareButton path={sharePath} title={product.name}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </ShareButton>
          </div>

          <p className="mt-4 text-3xl font-bold text-zinc-900">
            {formatProductPrice(product.price)}
          </p>

          {product.summary && (
            <div
              className="mt-6 text-sm leading-relaxed text-zinc-600"
              dangerouslySetInnerHTML={{ __html: product.summary }}
            />
          )}

          {/* 적립 / 배송 정보 */}
          <dl className="mt-6 space-y-2 border-t border-zinc-100 pt-5 text-sm">
            {pointEarnRate > 0 && (
              <div className="flex items-baseline gap-6">
                <dt className="w-12 shrink-0 text-zinc-500">적립</dt>
                <dd className="text-zinc-700">
                  <span className="font-semibold text-zinc-900">{expectedPoints.toLocaleString()}</span> 포인트 적립예정
                  <span
                    className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-600"
                    title={`구매 금액의 ${pointEarnRate}% 가 적립됩니다 (배송완료 후).`}
                  >
                    ?
                  </span>
                </dd>
              </div>
            )}
            <div className="flex items-baseline gap-6">
              <dt className="w-12 shrink-0 text-zinc-500">배송</dt>
              <dd className="text-zinc-700">
                택배 · {' '}
                {freeShippingThreshold > 0 && product.price >= freeShippingThreshold ? (
                  <span className="font-semibold text-emerald-600">무료배송</span>
                ) : (
                  <>
                    기본 <span className="font-semibold text-zinc-900">{shippingFee.toLocaleString()}원</span>
                    {freeShippingThreshold > 0 && (
                      <span className="ml-1 text-xs text-zinc-400">
                        ({freeShippingThreshold.toLocaleString()}원 이상 무료)
                      </span>
                    )}
                  </>
                )}
              </dd>
            </div>
          </dl>

          <ProductBuyBox
            productId={product.id}
            price={product.price}
            initialLiked={initialLiked}
            initialLikeCount={wishlistCount ?? 0}
          />
        </div>
      </div>

      {/* 상세 설명 */}
      <div className="mt-16 border-t border-zinc-200 pt-12">
        <h2 className="mb-6 text-lg font-bold text-zinc-900">상세 정보</h2>

        {/* 상단 고정 콘텐츠 */}
        {topHtml && (
          <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: topHtml }} />
        )}

        {product.description && (
          <div
            className="prose max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        )}

        {/* 하단 고정 콘텐츠 */}
        {bottomHtml && (
          <div className="prose max-w-none mt-8" dangerouslySetInnerHTML={{ __html: bottomHtml }} />
        )}
      </div>
    </div>
    </div>
  )
}
