'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CheckoutItem = {
  productId: string
  quantity: number
  // 시점 스냅샷 — 클라이언트가 보내준 값과 DB 가격을 둘 다 검증
  name: string
  price: number
  thumbnailUrl: string | null
}

export type PlaceOrderInput = {
  // 결제 대상 아이템 (cart 또는 단일 상품)
  source: 'cart' | 'buy_now'
  // source='cart' 일 때, 카트의 일부만 결제하고 싶다면 ID 목록 전달
  cartItemIds?: string[]
  buyNowProductId?: string
  buyNowQuantity?: number

  // 주문자
  ordererName: string
  ordererPhone: string
  ordererEmail: string

  // 배송지
  recipientName: string
  recipientPhone: string
  postalCode: string
  address1: string
  address2: string
  deliveryMemo: string

  customsClearanceNo: string

  // 포인트 사용 (원 단위)
  pointsUsed: number
}

// "YYYYMMDD-NNNN" 형태의 주문번호 생성 — 같은 날의 기존 건수 + 1
async function generateOrderNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .like('order_no', `${ymd}-%`)
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `${ymd}-${seq}`
}

export async function placeOrder(input: PlaceOrderInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 현재 사이트 + 상점 정책
  const { data: site } = await supabase
    .from('sites')
    .select('id, shipping_fee, free_shipping_threshold, point_earn_rate, point_min_balance, point_min_order_amount')
    .limit(1)
    .single()
  if (!site) return { error: '사이트 설정을 찾을 수 없습니다.' }

  // 1) 주문할 상품 목록 결정 (cart 또는 buy_now)
  let items: { productId: string; quantity: number; cartItemId?: string }[] = []
  if (input.source === 'buy_now') {
    if (!input.buyNowProductId || !input.buyNowQuantity) {
      return { error: '주문 상품 정보가 누락되었습니다.' }
    }
    items = [{ productId: input.buyNowProductId, quantity: Math.max(1, Math.floor(input.buyNowQuantity)) }]
  } else {
    let cartQuery = supabase
      .from('cart_items')
      .select('id, product_id, quantity')
      .eq('user_id', user.id)
    if (input.cartItemIds && input.cartItemIds.length > 0) {
      cartQuery = cartQuery.in('id', input.cartItemIds)
    }
    const { data: cart } = await cartQuery
    if (!cart || cart.length === 0) return { error: '장바구니가 비어있습니다.' }
    items = cart.map((c) => ({ productId: c.product_id, quantity: c.quantity, cartItemId: c.id }))
  }

  // 2) 상품 정보 fetch (서버 진실)
  const productIds = items.map((i) => i.productId)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, thumbnail_url, is_active')
    .in('id', productIds)
  if (!products || products.length === 0) return { error: '상품을 찾을 수 없습니다.' }
  const productMap = new Map(products.map((p) => [p.id, p]))

  // 3) 금액 계산 (서버에서 단일 진실)
  let subtotal = 0
  const lineItems: {
    product_id: string
    product_name: string
    product_thumbnail_url: string | null
    unit_price: number
    quantity: number
    subtotal: number
  }[] = []
  for (const it of items) {
    const p = productMap.get(it.productId)
    if (!p) return { error: `삭제된 상품이 있습니다.` }
    if (!p.is_active) return { error: `판매 중지된 상품이 있습니다: ${p.name}` }
    const lineSubtotal = p.price * it.quantity
    subtotal += lineSubtotal
    lineItems.push({
      product_id: p.id,
      product_name: p.name,
      product_thumbnail_url: p.thumbnail_url,
      unit_price: p.price,
      quantity: it.quantity,
      subtotal: lineSubtotal,
    })
  }

  // 배송비
  const baseShipping = site.shipping_fee ?? 0
  const freeThreshold = site.free_shipping_threshold ?? 0
  const shippingFee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : baseShipping

  // 포인트 사용 검증
  let pointsUsed = Math.max(0, Math.floor(input.pointsUsed || 0))
  if (pointsUsed > 0) {
    // 사용 가능 최소 보유/주문금액 정책
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()
    const balance = profile?.points ?? 0
    if (pointsUsed > balance) {
      return { error: `보유 포인트보다 많이 사용할 수 없습니다.` }
    }
    if (balance < (site.point_min_balance ?? 0)) {
      pointsUsed = 0
    }
    if (subtotal < (site.point_min_order_amount ?? 0)) {
      return { error: `${(site.point_min_order_amount ?? 0).toLocaleString()}원 이상 주문 시 포인트 사용 가능합니다.` }
    }
    // 최대 = subtotal (배송비는 포인트로 차감 불가)
    if (pointsUsed > subtotal) pointsUsed = subtotal
  }

  const totalAmount = Math.max(0, subtotal + shippingFee - pointsUsed)
  // 적립 예정: (subtotal - pointsUsed) × earnRate / 100, 정수
  const pointsEarned = Math.floor(Math.max(0, subtotal - pointsUsed) * (site.point_earn_rate ?? 0) / 100)

  // 4) 주문 번호 생성
  const orderNo = await generateOrderNo(supabase)

  // 5) 주문 insert
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_no: orderNo,
      site_id: site.id,
      user_id: user.id,
      status: 'pending_payment',
      orderer_name: input.ordererName.trim(),
      orderer_phone: input.ordererPhone.trim(),
      orderer_email: input.ordererEmail.trim(),
      recipient_name: input.recipientName.trim(),
      recipient_phone: input.recipientPhone.trim(),
      postal_code: input.postalCode.trim() || null,
      address1: input.address1.trim(),
      address2: input.address2.trim() || null,
      delivery_memo: input.deliveryMemo.trim() || null,
      customs_clearance_no: input.customsClearanceNo.trim() || null,
      subtotal,
      shipping_fee: shippingFee,
      points_used: pointsUsed,
      total_amount: totalAmount,
      points_earned: pointsEarned,
      payment_method: 'bank_transfer',
    })
    .select('id, order_no')
    .single()

  if (orderError || !order) {
    return { error: `주문 생성 실패: ${orderError?.message ?? '알 수 없는 오류'}` }
  }

  // 6) order_items insert
  const itemsRows = lineItems.map((li) => ({ ...li, order_id: order.id }))
  const { error: itemsError } = await supabase.from('order_items').insert(itemsRows)
  if (itemsError) {
    // rollback orders
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: `주문 항목 저장 실패: ${itemsError.message}` }
  }

  // 7) 포인트 차감 (사용한 경우) + history 기록
  if (pointsUsed > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()
    const newBalance = Math.max(0, (profile?.points ?? 0) - pointsUsed)
    await supabase.from('profiles').update({ points: newBalance }).eq('id', user.id)
    await supabase.from('point_history').insert({
      user_id: user.id,
      delta: -pointsUsed,
      balance_after: newBalance,
      reason: `주문 ${order.order_no} 결제`,
      source: 'order_use',
      order_id: order.id,
    })
  }

  // 8) 카트 비우기 (cart 모드일 때만)
  if (input.source === 'cart') {
    const cartItemIds = items.map((i) => i.cartItemId).filter(Boolean) as string[]
    if (cartItemIds.length > 0) {
      await supabase.from('cart_items').delete().in('id', cartItemIds)
    }
  }

  revalidatePath('/cart')
  revalidatePath('/admin/orders')
  return { success: true, orderId: order.id, orderNo: order.order_no }
}
