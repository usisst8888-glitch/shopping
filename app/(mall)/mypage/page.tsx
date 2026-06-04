import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '주문 조회' }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '입금 대기', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paid: { label: '입금 확인', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  preparing: { label: '배송 준비', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  shipping: { label: '배송중', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
  delivered: { label: '배송완료', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: '취소', color: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
}

export default async function OrderHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_no, status, subtotal, shipping_fee, total_amount, points_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // 각 주문의 첫 상품 + 항목 수
  let itemsByOrder = new Map<string, { name: string; thumb: string | null; count: number }>()
  if (orders && orders.length > 0) {
    const orderIds = orders.map((o) => o.id)
    const { data: rows } = await supabase
      .from('order_items')
      .select('order_id, product_name, product_thumbnail_url')
      .in('order_id', orderIds)
    const tmp = new Map<string, { name: string; thumb: string | null; count: number }>()
    for (const r of rows ?? []) {
      const existing = tmp.get(r.order_id)
      if (existing) {
        existing.count += 1
      } else {
        tmp.set(r.order_id, { name: r.product_name, thumb: r.product_thumbnail_url, count: 1 })
      }
    }
    itemsByOrder = tmp
  }

  return (
    <section>
      <h2 className="mb-5 text-xl font-bold text-zinc-900">주문 조회</h2>
      {!orders || orders.length === 0 ? (
        <div className="rounded-xl bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-zinc-400">주문 내역이 없습니다.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-zinc-900 hover:underline">
            쇼핑하러 가기 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const st = STATUS_LABEL[o.status] ?? { label: o.status, color: 'bg-zinc-100 text-zinc-600 ring-zinc-200' }
            const summary = itemsByOrder.get(o.id)
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow md:p-5"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-zinc-900">{o.order_no}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {new Date(o.created_at).toLocaleDateString('ko-KR')} · {new Date(o.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {summary?.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={summary.thumb} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-zinc-200" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-md bg-zinc-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {summary?.name ?? '주문 상품'}
                        {summary && summary.count > 1 && (
                          <span className="ml-1 text-zinc-400">외 {summary.count - 1}건</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        상품 {o.subtotal.toLocaleString()}원 · 배송 {o.shipping_fee.toLocaleString()}원
                        {o.points_used > 0 && ` · 포인트 ${o.points_used.toLocaleString()}P`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-zinc-900">{o.total_amount.toLocaleString()}원</p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">상세보기 →</p>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
