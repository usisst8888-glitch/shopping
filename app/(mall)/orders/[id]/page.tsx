import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '주문 상세' }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '입금 대기', color: 'bg-amber-50 text-amber-700' },
  paid: { label: '입금 확인', color: 'bg-blue-50 text-blue-700' },
  preparing: { label: '배송 준비', color: 'bg-indigo-50 text-indigo-700' },
  shipping: { label: '배송중', color: 'bg-violet-50 text-violet-700' },
  delivered: { label: '배송완료', color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: '취소', color: 'bg-zinc-100 text-zinc-500' },
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const isSuccess = sp.success === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) notFound()

  // 권한 — 본인 주문만 (관리자는 별도 페이지)
  if (order.user_id !== user.id) {
    redirect('/')
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at')

  const { data: site } = await supabase
    .from('sites')
    .select('bank_name, bank_account_number, bank_account_holder')
    .limit(1)
    .single()

  const status = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-zinc-100 text-zinc-600' }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* 헤더 — 성공 시 안내 */}
      {isSuccess && (
        <div className="mb-6 rounded-xl bg-emerald-50 px-6 py-5 text-center">
          <p className="text-lg font-bold text-emerald-700">주문이 접수되었습니다</p>
          <p className="mt-1 text-sm text-emerald-600">
            아래 계좌로 입금이 확인되면 배송 준비가 시작됩니다.
          </p>
        </div>
      )}

      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">주문 상세</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">홈으로</Link>
      </div>

      <div className="space-y-5">
        {/* 주문 정보 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">주문번호</p>
              <p className="mt-0.5 font-mono text-base font-bold text-zinc-900">{order.order_no}</p>
              <p className="mt-1 text-xs text-zinc-400">{new Date(order.created_at).toLocaleString('ko-KR')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>

          {/* 입금 안내 */}
          {order.status === 'pending_payment' && site?.bank_name && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">아래 계좌로 입금해주세요</p>
              <p className="mt-1 font-mono text-base font-bold text-zinc-900">
                {site.bank_name} {site.bank_account_number}
              </p>
              <p className="text-xs text-zinc-600">예금주 {site.bank_account_holder}</p>
              <p className="mt-2 text-xs text-amber-700">
                입금자명: <span className="font-semibold">{order.orderer_name}</span> ·
                {' '}금액: <span className="font-semibold">{order.total_amount.toLocaleString()}원</span>
              </p>
            </div>
          )}
        </section>

        {/* 주문 상품 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-zinc-900">주문 상품</h3>
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {(items ?? []).map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-3">
                {it.product_thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.product_thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover ring-1 ring-zinc-200" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{it.product_name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{it.quantity}개 · {it.unit_price.toLocaleString()}원</p>
                </div>
                <p className="text-sm font-bold text-zinc-900">{it.subtotal.toLocaleString()}원</p>
              </div>
            ))}
          </div>
        </section>

        {/* 결제 정보 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-zinc-900">결제 정보</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">상품가격</dt>
              <dd className="text-zinc-900">{order.subtotal.toLocaleString()}원</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">배송비</dt>
              <dd className="text-zinc-900">+ {order.shipping_fee.toLocaleString()}원</dd>
            </div>
            {order.points_used > 0 && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">포인트 사용</dt>
                <dd className="text-rose-600">− {order.points_used.toLocaleString()}원</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-zinc-100 pt-3">
              <dt className="text-base font-bold text-zinc-900">결제 금액</dt>
              <dd className="text-xl font-bold text-zinc-900">{order.total_amount.toLocaleString()}원</dd>
            </div>
            {order.points_earned > 0 && (
              <p className="pt-1 text-right text-xs text-zinc-500">
                {order.points_earned.toLocaleString()} 포인트 적립예정
              </p>
            )}
          </dl>
        </section>

        {/* 배송지 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-zinc-900">배송지</h3>
          <div className="space-y-1 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">{order.recipient_name} <span className="text-zinc-500">{order.recipient_phone}</span></p>
            {order.postal_code && <p>[{order.postal_code}]</p>}
            <p>{order.address1}</p>
            {order.address2 && <p>{order.address2}</p>}
            {order.delivery_memo && (
              <p className="mt-2 rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                배송메모: {order.delivery_memo}
              </p>
            )}
          </div>
        </section>

        {/* 주문자 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-zinc-900">주문자 정보</h3>
          <div className="space-y-1 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">{order.orderer_name}</p>
            <p>{order.orderer_phone}</p>
            <p>{order.orderer_email}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
