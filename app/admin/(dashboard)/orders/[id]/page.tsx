import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrderDetail } from '../actions'
import { OrderStatusPanel } from './order-status-panel'
import { OrderMemoEditor } from './order-memo-editor'

export const metadata = { title: '주문 상세' }

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getOrderDetail(id)
  if (!data) notFound()
  const { order, items } = data

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs text-zinc-500 hover:text-zinc-900">← 주문 목록</Link>
          <h1 className="mt-1 font-mono text-2xl font-bold text-zinc-900">{order.order_no}</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {new Date(order.created_at).toLocaleString('ko-KR')}
            {order.payment_completed_at && (
              <> · 입금확인 {new Date(order.payment_completed_at).toLocaleString('ko-KR')}</>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── 좌측 — 상품/금액/배송/주문자 ── */}
        <div className="space-y-5">
          {/* 주문 상품 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-zinc-900">주문 상품</h3>
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-3">
                  {it.product_thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.product_thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover ring-1 ring-zinc-200" />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{it.product_name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {it.quantity}개 · {it.unit_price.toLocaleString()}원
                    </p>
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
              <div className="flex justify-between pt-1">
                <dt className="text-zinc-500">결제수단</dt>
                <dd className="text-zinc-700">무통장입금</dd>
              </div>
              {order.points_earned > 0 && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">
                    {order.status === 'delivered' ? '적립 포인트' : '적립 예정 포인트'}
                  </dt>
                  <dd className="text-emerald-600">{order.points_earned.toLocaleString()}P</dd>
                </div>
              )}
            </dl>
          </section>

          {/* 배송지 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-zinc-900">배송지</h3>
            <div className="space-y-1 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">
                {order.recipient_name} <span className="text-zinc-500">{order.recipient_phone}</span>
              </p>
              {order.postal_code && <p>[{order.postal_code}]</p>}
              <p>{order.address1}</p>
              {order.address2 && <p>{order.address2}</p>}
              {order.delivery_memo && (
                <p className="mt-2 rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  배송메모: {order.delivery_memo}
                </p>
              )}
              {order.customs_clearance_no && (
                <p className="mt-2 text-xs text-zinc-500">
                  개인통관고유부호: <span className="font-mono">{order.customs_clearance_no}</span>
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
              {order.user_id ? (
                <p className="text-xs text-zinc-400">회원 ID: {order.user_id}</p>
              ) : (
                <p className="text-xs text-zinc-400">비회원 또는 탈퇴 회원</p>
              )}
            </div>
          </section>
        </div>

        {/* ── 우측 — 상태/메모 ── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <OrderStatusPanel id={order.id} status={order.status} pointsUsed={order.points_used} pointsEarned={order.points_earned} />
          <OrderMemoEditor id={order.id} initialMemo={order.admin_memo ?? ''} />
        </div>
      </div>
    </div>
  )
}
