'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * 찜 토글 — 이미 있으면 삭제(unlike), 없으면 추가(like).
 * 반환: { liked: 최종 상태, count: 최종 카운트, error? }
 */
export async function toggleWishlist(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 현재 본인 찜 존재 여부
  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase.from('wishlists').delete().eq('id', existing.id)
  } else {
    await supabase.from('wishlists').insert({
      user_id: user.id,
      product_id: productId,
    })
  }

  // 최종 카운트
  const { count } = await supabase
    .from('wishlists')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)

  revalidatePath(`/product/${productId}`)
  return { liked: !existing, count: count ?? 0 }
}
