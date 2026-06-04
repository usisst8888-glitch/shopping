'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getCartItems() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('cart_items')
    .select('id, quantity, product_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) return []

  const productIds = data.map((item) => item.product_id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url, is_active, status')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))

  return data.map((item) => ({
    ...item,
    product: productMap.get(item.product_id) ?? null,
  }))
}

export async function addToCart(productId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const qty = Math.max(1, Math.floor(quantity))

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single()

  if (existing) {
    await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + qty })
      .eq('id', existing.id)
  } else {
    await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: productId,
      quantity: qty,
    })
  }

  revalidatePath('/cart')
  return { success: true }
}

export async function updateCartQuantity(id: string, quantity: number) {
  const supabase = await createClient()
  if (quantity <= 0) {
    await supabase.from('cart_items').delete().eq('id', id)
  } else {
    await supabase.from('cart_items').update({ quantity }).eq('id', id)
  }
  revalidatePath('/cart')
  return { success: true }
}

export async function removeFromCart(id: string) {
  const supabase = await createClient()
  await supabase.from('cart_items').delete().eq('id', id)
  revalidatePath('/cart')
  return { success: true }
}

export async function clearCart() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  await supabase.from('cart_items').delete().eq('user_id', user.id)
  revalidatePath('/cart')
  return { success: true }
}

export async function deleteCartItems(ids: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  if (ids.length === 0) return { success: true }
  await supabase.from('cart_items').delete().eq('user_id', user.id).in('id', ids)
  revalidatePath('/cart')
  return { success: true }
}

/**
 * 품절(또는 비활성) 상품에 해당하는 카트 항목을 일괄 삭제.
 * is_active=false 인 상품들의 id 를 찾아서 본인 카트에서 제거.
 */
export async function deleteSoldoutCartItems() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: cart } = await supabase
    .from('cart_items')
    .select('id, product_id')
    .eq('user_id', user.id)
  if (!cart || cart.length === 0) return { success: true, removed: 0 }

  const productIds = [...new Set(cart.map((c) => c.product_id))]
  const { data: products } = await supabase
    .from('products')
    .select('id, status, is_active')
    .in('id', productIds)
  const soldoutProductIds = new Set(
    (products ?? [])
      .filter((p) => !p.is_active || p.status === 'soldout' || p.status === 'hidden')
      .map((p) => p.id),
  )
  // 카트에는 있지만 products 에 아예 없는 경우(삭제된 상품)도 정리
  const existingIds = new Set((products ?? []).map((p) => p.id))
  const removeIds = cart
    .filter((c) => soldoutProductIds.has(c.product_id) || !existingIds.has(c.product_id))
    .map((c) => c.id)

  if (removeIds.length === 0) return { success: true, removed: 0 }
  await supabase.from('cart_items').delete().eq('user_id', user.id).in('id', removeIds)
  revalidatePath('/cart')
  return { success: true, removed: removeIds.length }
}
