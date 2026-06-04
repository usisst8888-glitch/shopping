'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type UpdateProfileInput = {
  name: string
  gender: 'male' | 'female' | null
  phone: string
  zipcode: string
  address: string
  addressDetail: string
  birthdate: string // YYYY-MM-DD or ''
  avatarUrl: string | null
  newPassword: string // empty = unchanged
}

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 1) 비밀번호 변경 (입력된 경우만)
  if (input.newPassword) {
    if (!PASSWORD_RULE.test(input.newPassword)) {
      return { error: '비밀번호는 8자리 이상의 대소문자/숫자/특수문자 조합이어야 합니다.' }
    }
    const { error: pwError } = await supabase.auth.updateUser({ password: input.newPassword })
    if (pwError) return { error: `비밀번호 변경 실패: ${pwError.message}` }
  }

  // 2) 프로필 컬럼 업데이트
  const patch: Record<string, string | null> = {
    name: input.name.trim() || null,
    gender: input.gender,
    phone: input.phone.trim() || null,
    zipcode: input.zipcode.trim() || null,
    address: input.address.trim() || null,
    address_detail: input.addressDetail.trim() || null,
    birthdate: input.birthdate || null,
    avatar_url: input.avatarUrl,
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
  if (error) return { error: `정보 수정 실패: ${error.message}` }

  revalidatePath('/mypage')
  revalidatePath('/mypage/edit')
  return { success: true }
}

/**
 * 회원 탈퇴 — 본인 profiles row 를 삭제.
 * (auth.users CASCADE 가 profiles 까지 함께 보장되도록 FK 가 설정되어 있음)
 * 실제 auth.users 삭제는 admin API 가 필요하므로, 일단 profiles row 만 삭제하고
 * 로그아웃 처리. 이후 별도 cron 으로 고아 auth.users 정리 가능.
 */
export async function withdrawAccount(confirmText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (confirmText !== '탈퇴합니다') {
    return { error: '확인 문구가 일치하지 않습니다.' }
  }

  // 본인 profiles 삭제 → cart_items, wishlists, point_history 등은 ON DELETE CASCADE / SET NULL 로 자동 정리
  // orders 는 user_id SET NULL 로 남음 (관리자 추적용)
  await supabase.from('profiles').delete().eq('id', user.id)

  // 로그아웃
  await supabase.auth.signOut()

  redirect('/')
}
