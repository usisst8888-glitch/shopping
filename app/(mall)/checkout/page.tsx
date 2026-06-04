import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckoutForm } from './checkout-form'

export const metadata = { title: '주문/결제' }

type SearchParams = Promise<{ productId?: string; qty?: string; cartItems?: string }>

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const buyNowProductId = sp.productId ?? ''
  const buyNowQty = Math.max(1, parseInt(sp.qty ?? '1') || 1)
  const cartItemIds = sp.cartItems ? sp.cartItems.split(',').filter(Boolean) : undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(buyNowProductId ? `/checkout?productId=${buyNowProductId}&qty=${buyNowQty}` : '/checkout')}`)
  }

  // 사이트 결제·배송·포인트 정책 + 무통장 계좌
  const { data: site } = await supabase
    .from('sites')
    .select('id, bank_name, bank_account_number, bank_account_holder, shipping_fee, free_shipping_threshold, point_earn_rate, point_min_balance, point_min_order_amount')
    .limit(1)
    .single()

  // 사용자 프로필
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, points, phone, zipcode, address, address_detail')
    .eq('id', user.id)
    .single()

  // 주문 대상: buy_now 우선, 없으면 카트
  let items: { id: string; name: string; price: number; thumbnail_url: string | null; quantity: number }[] = []
  let source: 'cart' | 'buy_now' = 'cart'
  if (buyNowProductId) {
    source = 'buy_now'
    const { data: p } = await supabase
      .from('products')
      .select('id, name, price, thumbnail_url, is_active')
      .eq('id', buyNowProductId)
      .single()
    if (p && p.is_active) {
      items = [{ id: p.id, name: p.name, price: p.price, thumbnail_url: p.thumbnail_url, quantity: buyNowQty }]
    }
  } else {
    let cartQuery = supabase
      .from('cart_items')
      .select('id, product_id, quantity')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (cartItemIds && cartItemIds.length > 0) {
      cartQuery = cartQuery.in('id', cartItemIds)
    }
    const { data: cart } = await cartQuery
    if (cart && cart.length > 0) {
      const ids = cart.map((c) => c.product_id)
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, thumbnail_url, is_active')
        .in('id', ids)
      const pmap = new Map((products ?? []).map((p) => [p.id, p]))
      items = cart
        .map((c) => {
          const p = pmap.get(c.product_id)
          if (!p || !p.is_active) return null
          return { id: p.id, name: p.name, price: p.price, thumbnail_url: p.thumbnail_url, quantity: c.quantity }
        })
        .filter((x): x is { id: string; name: string; price: number; thumbnail_url: string | null; quantity: number } => x != null)
    }
  }

  // 주문 대상 없음 → 카트로 이동
  if (items.length === 0) {
    redirect('/cart')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">주문/결제</h1>
      <CheckoutForm
        source={source}
        buyNowProductId={buyNowProductId || undefined}
        buyNowQuantity={source === 'buy_now' ? buyNowQty : undefined}
        cartItemIds={source === 'cart' && cartItemIds ? cartItemIds : undefined}
        items={items}
        userEmail={user.email ?? ''}
        userName={profile?.name ?? ''}
        userPhone={profile?.phone ?? ''}
        userZipcode={profile?.zipcode ?? ''}
        userAddress={profile?.address ?? ''}
        userAddressDetail={profile?.address_detail ?? ''}
        userPoints={profile?.points ?? 0}
        site={{
          bankName: site?.bank_name ?? null,
          bankAccountNumber: site?.bank_account_number ?? null,
          bankAccountHolder: site?.bank_account_holder ?? null,
          shippingFee: site?.shipping_fee ?? 0,
          freeShippingThreshold: site?.free_shipping_threshold ?? 0,
          pointEarnRate: site?.point_earn_rate ?? 0,
          pointMinBalance: site?.point_min_balance ?? 0,
          pointMinOrderAmount: site?.point_min_order_amount ?? 0,
        }}
      />
    </div>
  )
}
