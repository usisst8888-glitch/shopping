'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Member = {
  id: string
  email: string
  role: string
  created_at: string
}

export async function getMembers(search?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false })

  if (search?.trim()) {
    query = query.ilike('email', `%${search.trim()}%`)
  }

  const { data } = await query
  return (data ?? []) as Member[]
}

export async function updateMemberRole(id: string, role: 'admin' | 'user') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (error) {
    return { error: '역할 변경 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/members')
  return { success: true }
}

export async function deleteMember(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: '회원 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/members')
  return { success: true }
}
