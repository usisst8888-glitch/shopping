'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type MemberGroup = {
  id: string
  name: string
  description: string | null
  color: string
  sort_order: number
  created_at: string
  member_count?: number
}

export async function getGroups(): Promise<MemberGroup[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('member_groups')
    .select('id, name, description, color, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const groups = (data ?? []) as MemberGroup[]
  if (groups.length === 0) return []

  // 각 그룹의 회원 수 집계
  const ids = groups.map((g) => g.id)
  const { data: profs } = await supabase
    .from('profiles')
    .select('group_id')
    .in('group_id', ids)
  const counts = new Map<string, number>()
  for (const p of (profs ?? []) as { group_id: string }[]) {
    counts.set(p.group_id, (counts.get(p.group_id) ?? 0) + 1)
  }
  return groups.map((g) => ({ ...g, member_count: counts.get(g.id) ?? 0 }))
}

export async function createGroup(input: { name: string; color: string; description?: string }) {
  const supabase = await createClient()
  const name = input.name.trim()
  if (!name) return { error: '그룹 이름을 입력해주세요.' }

  const { data: max } = await supabase
    .from('member_groups')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = ((max?.sort_order as number | null) ?? 0) + 1

  const { error } = await supabase.from('member_groups').insert({
    name,
    color: input.color || '#3b82f6',
    description: input.description?.trim() || null,
    sort_order: nextOrder,
  })
  if (error) return { error: '그룹 생성 중 오류가 발생했습니다.' }
  revalidatePath('/admin/members')
  return { success: true }
}

export async function updateGroup(
  id: string,
  patch: { name?: string; color?: string; description?: string | null },
) {
  const supabase = await createClient()
  const update: Record<string, string | null> = {}
  if (patch.name !== undefined) {
    const v = patch.name.trim()
    if (!v) return { error: '그룹 이름을 입력해주세요.' }
    update.name = v
  }
  if (patch.color !== undefined) update.color = patch.color
  if (patch.description !== undefined) {
    update.description = typeof patch.description === 'string' ? patch.description.trim() || null : null
  }
  const { error } = await supabase.from('member_groups').update(update).eq('id', id)
  if (error) return { error: '그룹 수정 중 오류가 발생했습니다.' }
  revalidatePath('/admin/members')
  return { success: true }
}

export async function deleteGroup(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('member_groups').delete().eq('id', id)
  if (error) return { error: '그룹 삭제 중 오류가 발생했습니다.' }
  // ON DELETE SET NULL → 회원의 group_id 도 자동 NULL
  revalidatePath('/admin/members')
  return { success: true }
}

export async function assignMemberGroup(memberId: string, groupId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ group_id: groupId })
    .eq('id', memberId)
  if (error) return { error: '그룹 변경 중 오류가 발생했습니다.' }
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${memberId}`)
  return { success: true }
}
