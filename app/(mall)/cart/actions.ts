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
    .select('id, name, slug, price, thumbnail_url')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))

  return data.map((item) => ({
    ...item,
    product: productMap.get(item.product_id) ?? null,
  }))
}

export async function addToCart(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single()

  if (existing) {
    await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: productId,
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
