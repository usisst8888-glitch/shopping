import { createClient } from '@/lib/supabase/server'
import { getCartItems } from './actions'
import { CartList } from './cart-list'

export const metadata = { title: '장바구니' }

export default async function CartPage() {
  const items = await getCartItems()

  // 사이트 정책 (배송비/무료배송 기준) — 합계 영역 표시용
  const supabase = await createClient()
  const { data: site } = await supabase
    .from('sites')
    .select('shipping_fee, free_shipping_threshold')
    .limit(1)
    .single()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <CartList
        items={items}
        shippingFee={site?.shipping_fee ?? 0}
        freeShippingThreshold={site?.free_shipping_threshold ?? 0}
      />
    </div>
  )
}
