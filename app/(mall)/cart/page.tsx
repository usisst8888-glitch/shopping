import { getCartItems } from './actions'
import { CartList } from './cart-list'

export const metadata = { title: '장바구니' }

export default async function CartPage() {
  const items = await getCartItems()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900">장바구니</h1>
      <CartList items={items} />
    </div>
  )
}
