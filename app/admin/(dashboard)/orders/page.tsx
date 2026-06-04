import Link from 'next/link'
import { getOrders, type OrderListItem, type OrderStatus } from './actions'
import { OrderStatusSelect } from './order-status-select'

export const metadata = { title: '주문 관리' }

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending_payment', label: '입금 대기' },
  { value: 'paid', label: '입금 확인' },
  { value: 'preparing', label: '배송 준비' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소' },
]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    size?: string
    search?: string
    status?: string
    from?: string
    to?: string
  }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const size = Math.max(1, parseInt(params.size ?? '20') || 20)
  const search = params.search ?? ''
  const status = (params.status ?? 'all') as OrderStatus | 'all'
  const from = params.from ?? ''
  const to = params.to ?? ''

  const { orders, total } = await getOrders({ page, size, search, status, from, to })
  const totalPages = Math.max(1, Math.ceil(total / size))

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams()
    const merged = {
      page: String(page),
      size: String(size),
      search,
      status,
      from,
      to,
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    }
    for (const [k, v] of Object.entries(merged)) {
      if (k === 'page') {
        if (v !== '1') p.set(k, v)
      } else if (v && v !== 'all') {
        p.set(k, v)
      }
    }
    const qs = p.toString()
    return `/admin/orders${qs ? `?${qs}` : ''}`
  }

  // 페이지네이션 범위
  const maxButtons = 5
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2))
  const endPage = Math.min(totalPages, startPage + maxButtons - 1)
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1)
  }
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">주문 관리</h1>
        <div className="text-sm text-zinc-500">
          총 <span className="font-semibold text-zinc-900">{total.toLocaleString()}</span>건
        </div>
      </div>

      {/* 필터 바 */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <form method="GET" action="/admin/orders" className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_140px_auto]">
          <input type="hidden" name="size" value={size} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">주문번호 / 주문자 / 이메일</label>
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="예: 20260530, 홍길동, user@example.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">상태</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">시작일</label>
            <input
              name="from"
              type="date"
              defaultValue={from}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">종료일</label>
            <input
              name="to"
              type="date"
              defaultValue={to}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              검색
            </button>
            {(search || status !== 'all' || from || to) && (
              <Link
                href="/admin/orders"
                className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                초기화
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* 테이블 — 한 주문의 각 항목을 row 로 펼치고 주문 정보는 rowSpan 으로 묶음 */}
      <div className="rounded-xl bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            조건에 맞는 주문이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] border-collapse text-sm [&_td]:border-r [&_td]:border-zinc-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-zinc-100 [&_th:last-child]:border-r-0">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-medium text-zinc-500">
                  <th className="w-10 px-3 py-3 text-center">
                    <input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed rounded border-zinc-300 opacity-40" />
                  </th>
                  <th className="w-48 px-3 py-3 text-left">주문번호/시각</th>
                  <th className="px-3 py-3 text-left">주문상품</th>
                  <th className="w-28 px-3 py-3 text-right">상품금액</th>
                  <th className="w-14 px-3 py-3 text-center">수량</th>
                  <th className="w-24 px-3 py-3 text-center">상태</th>
                  <th className="w-28 px-3 py-3 text-center">배송</th>
                  <th className="px-3 py-3 text-left">배송정보</th>
                  <th className="w-44 px-3 py-3 text-left">결제내역</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => {
                  const items = o.items
                  const rowCount = Math.max(1, items.length)
                  const c = new Date(o.created_at)
                  const dateStr = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`
                  const timeStr = `${String(c.getHours()).padStart(2, '0')}:${String(c.getMinutes()).padStart(2, '0')}`

                  if (items.length === 0) {
                    return (
                      <tr key={o.id} className="hover:bg-zinc-50/50">
                        <td className="px-3 py-3 text-center align-top">
                          <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-zinc-300" />
                        </td>
                        <OrderHeaderCell order={o} dateStr={dateStr} timeStr={timeStr} />
                        <td className="px-3 py-3 text-center text-xs text-zinc-400" colSpan={3}>
                          (주문 항목 없음)
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <OrderStatusSelect id={o.id} status={o.status} />
                        </td>
                        <OrderDeliveryCell shippingFee={o.shipping_fee} />
                        <OrderShippingInfoCell order={o} />
                        <OrderPaymentCell order={o} />
                      </tr>
                    )
                  }

                  return items.map((it, idx) => (
                    <tr key={`${o.id}-${it.id}`} className="hover:bg-zinc-50/50">
                      {idx === 0 && (
                        <>
                          <td rowSpan={rowCount} className="px-3 py-3 text-center align-top">
                            <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-zinc-300" />
                          </td>
                          <OrderHeaderCell order={o} dateStr={dateStr} timeStr={timeStr} rowSpan={rowCount} />
                        </>
                      )}
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-start gap-3">
                          {it.product_thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.product_thumbnail_url}
                              alt={it.product_name}
                              className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-zinc-100"
                            />
                          ) : (
                            <div className="h-14 w-14 shrink-0 rounded-md bg-zinc-100" />
                          )}
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-zinc-400">{it.id.slice(0, 18)}</p>
                            {it.product_id ? (
                              <Link
                                href={`/admin/products/${it.product_id}/edit`}
                                className="line-clamp-2 text-sm text-zinc-900 hover:underline"
                              >
                                {it.product_name}
                              </Link>
                            ) : (
                              <p className="line-clamp-2 text-sm text-zinc-900">{it.product_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right align-top text-sm font-medium text-zinc-900 whitespace-nowrap">
                        {it.subtotal.toLocaleString()}원
                      </td>
                      <td className="px-3 py-3 text-center align-top text-sm text-zinc-700">
                        {it.quantity}
                      </td>
                      {idx === 0 && (
                        <>
                          <td rowSpan={rowCount} className="px-3 py-3 text-center align-top">
                            <OrderStatusSelect id={o.id} status={o.status} />
                          </td>
                          <OrderDeliveryCell shippingFee={o.shipping_fee} rowSpan={rowCount} />
                          <OrderShippingInfoCell order={o} rowSpan={rowCount} />
                          <OrderPaymentCell order={o} rowSpan={rowCount} />
                        </>
                      )}
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <Link href={buildUrl({ page: 1 })} className={`rounded-lg px-3 py-2 text-sm ${page === 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&laquo;</Link>
          <Link href={buildUrl({ page: Math.max(1, page - 1) })} className={`rounded-lg px-3 py-2 text-sm ${page === 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&lsaquo;</Link>
          {pageNumbers.map((p) => (
            <Link key={p} href={buildUrl({ page: p })} className={`rounded-lg px-3 py-2 text-sm font-medium ${p === page ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{p}</Link>
          ))}
          <Link href={buildUrl({ page: Math.min(totalPages, page + 1) })} className={`rounded-lg px-3 py-2 text-sm ${page === totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&rsaquo;</Link>
          <Link href={buildUrl({ page: totalPages })} className={`rounded-lg px-3 py-2 text-sm ${page === totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&raquo;</Link>
        </div>
      )}
    </div>
  )
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: '무통장입금',
}

function OrderHeaderCell({
  order,
  dateStr,
  timeStr,
  rowSpan,
}: {
  order: OrderListItem
  dateStr: string
  timeStr: string
  rowSpan?: number
}) {
  return (
    <td rowSpan={rowSpan} className="px-3 py-3 align-top">
      <Link
        href={`/admin/orders/${order.id}`}
        className="block font-mono text-xs font-semibold text-zinc-900 hover:underline"
      >
        {order.order_no}
      </Link>
      <p className="mt-0.5 text-[11px] text-zinc-500">
        {dateStr} {timeStr}
      </p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-700">
        <svg className="h-3.5 w-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {order.orderer_name}
      </p>
      <Link
        href={`/admin/orders/${order.id}`}
        className="mt-2 inline-block rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
      >
        주문서 상세
      </Link>
    </td>
  )
}

function OrderDeliveryCell({ shippingFee, rowSpan }: { shippingFee: number; rowSpan?: number }) {
  return (
    <td rowSpan={rowSpan} className="px-3 py-3 text-center align-top">
      <p className="text-sm text-zinc-900">택배</p>
      <p className="mt-1 text-[11px] text-zinc-500">{shippingFee.toLocaleString()}원</p>
    </td>
  )
}

function OrderShippingInfoCell({ order, rowSpan }: { order: OrderListItem; rowSpan?: number }) {
  return (
    <td rowSpan={rowSpan} className="px-3 py-3 align-top">
      <p className="text-sm font-medium text-zinc-900">
        {order.recipient_name} <span className="text-zinc-400">/ {order.recipient_phone}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
        {order.postal_code && <span className="mr-1 text-zinc-400">({order.postal_code})</span>}
        {order.address1}
        {order.address2 && <span className="text-zinc-500"> {order.address2}</span>}
      </p>
      {order.customs_clearance_no && (
        <p className="mt-1 text-[11px] font-medium text-emerald-600">
          개인통관고유부호: {order.customs_clearance_no}
        </p>
      )}
      <div className="mt-2 flex gap-1">
        <Link
          href={`/admin/orders/${order.id}`}
          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
        >
          수정
        </Link>
        <Link
          href={`/admin/orders/${order.id}#memo`}
          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
        >
          관리자 메모
        </Link>
      </div>
    </td>
  )
}

function OrderPaymentCell({ order, rowSpan }: { order: OrderListItem; rowSpan?: number }) {
  return (
    <td rowSpan={rowSpan} className="px-3 py-3 align-top">
      <div className="space-y-1 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-zinc-500">총 결제금액</span>
          <span className="font-bold text-zinc-900">{order.total_amount.toLocaleString()}원</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-zinc-500">
          <span>소계</span>
          <span>{order.subtotal.toLocaleString()}원</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-zinc-500">
          <span>배송비</span>
          <span>{order.shipping_fee.toLocaleString()}원</span>
        </div>
        {order.points_used > 0 && (
          <div className="flex items-baseline justify-between gap-2 text-rose-500">
            <span>포인트</span>
            <span>−{order.points_used.toLocaleString()}원</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-1 text-zinc-500">
          <span>결제방법</span>
          <span className="text-zinc-700">{PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}</span>
        </div>
      </div>
    </td>
  )
}
