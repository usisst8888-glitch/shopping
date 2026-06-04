import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '위시 리스트' }

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: wishes } = await supabase
    .from('wishlists')
    .select('id, product_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const productIds = (wishes ?? []).map((w) => w.product_id)
  let products: { id: string; name: string; slug: string | null; price: number; thumbnail_url: string | null; is_active: boolean | null }[] = []
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, price, thumbnail_url, is_active')
      .in('id', productIds)
    products = data ?? []
  }
  const pmap = new Map(products.map((p) => [p.id, p]))

  // 카운트 (각 상품별 인기도 표시용)
  const { data: countsRaw } = await supabase
    .from('wishlists')
    .select('product_id')
    .in('product_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])
  const counts = new Map<string, number>()
  for (const r of countsRaw ?? []) {
    counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1)
  }

  return (
    <section>
      <h2 className="mb-5 text-xl font-bold text-zinc-900">위시 리스트</h2>
      {!wishes || wishes.length === 0 ? (
        <div className="rounded-xl bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-zinc-400">찜한 상품이 없습니다.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-zinc-900 hover:underline">
            상품 둘러보기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {wishes.map((w) => {
            const p = pmap.get(w.product_id)
            if (!p) return null
            const soldout = p.is_active === false
            return (
              <Link
                key={w.id}
                href={`/product/${p.slug || p.id}`}
                className="group block overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow"
              >
                <div className="relative aspect-square overflow-hidden bg-zinc-100">
                  {p.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 없음</div>
                  )}
                  {soldout && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                      판매 중지
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs text-zinc-700 md:text-sm">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-zinc-900 md:text-base">{p.price.toLocaleString()}원</p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    ♡ {counts.get(p.id) ?? 0}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
