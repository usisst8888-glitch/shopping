'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { NotificationType } from '@/lib/notifications'
import { createNotification } from '@/lib/notifications-server'

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

export type OrderRow = {
  id: string
  order_no: string
  user_id: string | null
  status: OrderStatus
  orderer_name: string
  orderer_phone: string
  orderer_email: string
  recipient_name: string
  recipient_phone: string
  postal_code: string | null
  address1: string
  address2: string | null
  delivery_memo: string | null
  customs_clearance_no: string | null
  subtotal: number
  shipping_fee: number
  points_used: number
  total_amount: number
  points_earned: number
  payment_method: string
  payment_completed_at: string | null
  admin_memo: string | null
  created_at: string
  updated_at: string
}

export type OrderItemRow = {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_thumbnail_url: string | null
  unit_price: number
  quantity: number
  subtotal: number
}

export type OrderListItem = OrderRow & {
  item_count: number
  items: OrderItemRow[]
}

export type OrderListParams = {
  page: number
  size: number
  search?: string // 주문번호 / 주문자명 / 이메일
  status?: OrderStatus | 'all'
  from?: string // YYYY-MM-DD
  to?: string // YYYY-MM-DD
}

export async function getOrders(params: OrderListParams): Promise<{ orders: OrderListItem[]; total: number }> {
  const supabase = await createClient()
  const { page, size, search, status, from, to } = params

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (search) {
    // 주문번호 / 주문자 이름 / 이메일 부분 일치 (or)
    query = query.or(
      `order_no.ilike.%${search}%,orderer_name.ilike.%${search}%,orderer_email.ilike.%${search}%`
    )
  }
  if (from) {
    query = query.gte('created_at', `${from}T00:00:00`)
  }
  if (to) {
    query = query.lte('created_at', `${to}T23:59:59`)
  }

  const offset = (page - 1) * size
  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + size - 1)

  const orders = (data ?? []) as OrderRow[]
  if (orders.length === 0) {
    return { orders: [], total: count ?? 0 }
  }

  // 항목 lookup
  const orderIds = orders.map((o) => o.id)
  const { data: items } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, product_name, product_thumbnail_url, unit_price, quantity, subtotal')
    .in('order_id', orderIds)
    .order('created_at')

  const itemsMap = new Map<string, OrderItemRow[]>()
  for (const it of (items ?? []) as OrderItemRow[]) {
    const arr = itemsMap.get(it.order_id) ?? []
    arr.push(it)
    itemsMap.set(it.order_id, arr)
  }

  return {
    orders: orders.map((o) => {
      const its = itemsMap.get(o.id) ?? []
      return { ...o, item_count: its.length, items: its }
    }),
    total: count ?? 0,
  }
}

export async function getOrderDetail(id: string) {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()
  if (!order) return null

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at')

  return { order: order as OrderRow, items: items ?? [] }
}

/**
 * 주문 상태 변경
 *  - 'paid' 로 전환: payment_completed_at = now()
 *  - 'delivered' 로 전환: 회원 포인트 적립 (points_earned)
 *  - 'cancelled' 로 전환: 차감했던 포인트 복원, 적립 미실행
 *
 * 같은 상태 전이를 두 번 적용하지 않도록 트랜잭션 없이도 안전하게:
 *  - paid: payment_completed_at IS NULL 인 경우만 set
 *  - delivered: status가 이미 'delivered' 면 skip
 *  - cancelled: status가 이미 'cancelled' 면 skip
 */
export async function updateOrderStatus(id: string, newStatus: OrderStatus) {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('orders')
    .select('id, status, user_id, points_used, points_earned, payment_completed_at')
    .eq('id', id)
    .single()
  if (!current) return { error: '주문을 찾을 수 없습니다.' }

  // 이미 같은 상태면 noop
  if (current.status === newStatus) {
    return { success: true }
  }

  const wasCancelled = current.status === 'cancelled'
  if (wasCancelled && newStatus !== 'cancelled') {
    return { error: '취소된 주문은 다시 변경할 수 없습니다.' }
  }

  const updates: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === 'paid' && !current.payment_completed_at) {
    updates.payment_completed_at = new Date().toISOString()
  }

  const { error } = await supabase.from('orders').update(updates).eq('id', id)
  if (error) return { error: `상태 변경 실패: ${error.message}` }

  // 회원 알림 발송 (user_id 가 있을 때만)
  if (current.user_id) {
    const NOTIF_MAP: Partial<Record<OrderStatus, { type: NotificationType; title: string; body?: string }>> = {
      paid: { type: 'order_paid', title: '입금이 확인되었습니다', body: '곧 상품을 준비해 발송해드릴게요.' },
      preparing: { type: 'order_preparing', title: '상품을 준비하고 있습니다' },
      shipping: { type: 'order_shipping', title: '상품이 발송되었습니다' },
      delivered: {
        type: 'order_delivered',
        title: '배송이 완료되었습니다',
        body: current.points_earned > 0 ? `${current.points_earned.toLocaleString()}P 가 적립되었어요.` : undefined,
      },
      cancelled: {
        type: 'order_cancelled',
        title: '주문이 취소되었습니다',
        body: current.points_used > 0 ? `사용하신 ${current.points_used.toLocaleString()}P 가 복원되었어요.` : undefined,
      },
    }
    const meta = NOTIF_MAP[newStatus]
    if (meta) {
      await createNotification({
        userId: current.user_id,
        type: meta.type,
        title: meta.title,
        body: meta.body,
        href: `/orders/${current.id}`,
      })
    }
  }

  // 부수 효과 — 포인트 변경 + history
  if (newStatus === 'delivered' && current.user_id && current.points_earned > 0) {
    // 적립
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', current.user_id)
      .single()
    const newBalance = (profile?.points ?? 0) + current.points_earned
    await supabase.from('profiles').update({ points: newBalance }).eq('id', current.user_id)
    await supabase.from('point_history').insert({
      user_id: current.user_id,
      delta: current.points_earned,
      balance_after: newBalance,
      reason: '구매 적립',
      source: 'order_earn',
      order_id: current.id,
    })
  } else if (newStatus === 'cancelled' && current.user_id && current.points_used > 0) {
    // 차감했던 포인트 복원
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', current.user_id)
      .single()
    const restored = (profile?.points ?? 0) + current.points_used
    await supabase.from('profiles').update({ points: restored }).eq('id', current.user_id)
    await supabase.from('point_history').insert({
      user_id: current.user_id,
      delta: current.points_used,
      balance_after: restored,
      reason: '주문 취소로 포인트 복원',
      source: 'order_cancel_restore',
      order_id: current.id,
    })
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${id}`)
  revalidatePath(`/orders/${id}`)
  return { success: true }
}

export async function updateOrderMemo(id: string, memo: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ admin_memo: memo.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: `메모 저장 실패: ${error.message}` }
  revalidatePath(`/admin/orders/${id}`)
  return { success: true }
}
