'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications-server'

export type Member = {
  id: string
  email: string
  name: string | null
  role: string
  points: number
  gender: 'male' | 'female' | 'other' | null
  phone: string | null
  homepage: string | null
  address: string | null
  zipcode: string | null
  address_detail: string | null
  birthdate: string | null
  referrer: string | null
  memo: string | null
  group_id: string | null
  group?: { id: string; name: string; color: string } | null
  created_at: string
  // 집계
  total_purchased: number
  post_count: number
}

export type PointHistoryEntry = {
  id: string
  delta: number
  balance_after: number
  reason: string
  source: string
  order_id: string | null
  created_at: string
}

export async function getMembers(search?: string): Promise<Member[]> {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, email, name, role, points, gender, phone, homepage, address, zipcode, address_detail, birthdate, referrer, memo, group_id, created_at')
    .order('created_at', { ascending: false })

  if (search?.trim()) {
    query = query.ilike('email', `%${search.trim()}%`)
  }

  const { data } = await query
  const rows = (data ?? []) as Omit<Member, 'total_purchased' | 'post_count' | 'group'>[]
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)

  // 그룹 정보
  const groupIds = [...new Set(rows.map((r) => r.group_id).filter(Boolean) as string[])]
  const groupMap = new Map<string, { id: string; name: string; color: string }>()
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('member_groups')
      .select('id, name, color')
      .in('id', groupIds)
    for (const g of (groups ?? []) as { id: string; name: string; color: string }[]) {
      groupMap.set(g.id, g)
    }
  }

  // 누적 구매금액: 결제완료(취소 아님)인 주문 합계
  const { data: orderRows } = await supabase
    .from('orders')
    .select('user_id, total_amount, status')
    .in('user_id', ids)
    .neq('status', 'cancelled')

  const totalByUser = new Map<string, number>()
  for (const o of (orderRows ?? []) as { user_id: string; total_amount: number }[]) {
    totalByUser.set(o.user_id, (totalByUser.get(o.user_id) ?? 0) + (o.total_amount ?? 0))
  }

  // 글 수: board_posts.user_id 카운트
  const { data: postRows } = await supabase
    .from('board_posts')
    .select('user_id')
    .in('user_id', ids)

  const postByUser = new Map<string, number>()
  for (const p of (postRows ?? []) as { user_id: string }[]) {
    postByUser.set(p.user_id, (postByUser.get(p.user_id) ?? 0) + 1)
  }

  return rows.map((r) => ({
    ...r,
    group: r.group_id ? groupMap.get(r.group_id) ?? null : null,
    total_purchased: totalByUser.get(r.id) ?? 0,
    post_count: postByUser.get(r.id) ?? 0,
  }))
}

export type MemberLoginInfo = {
  last_login_at: string | null
  last_login_ip: string | null
  login_count: number
}

export async function getMemberById(id: string): Promise<Member | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email, name, role, points, gender, phone, homepage, address, zipcode, address_detail, birthdate, referrer, memo, group_id, created_at')
    .eq('id', id)
    .single()
  if (!data) return null

  const row = data as Omit<Member, 'total_purchased' | 'post_count' | 'group'>

  const { data: orderRows } = await supabase
    .from('orders')
    .select('total_amount, status')
    .eq('user_id', id)
    .neq('status', 'cancelled')
  const total_purchased = (orderRows ?? []).reduce(
    (s, o: { total_amount: number }) => s + (o.total_amount ?? 0),
    0,
  )

  const { count: post_count } = await supabase
    .from('board_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', id)

  let group: { id: string; name: string; color: string } | null = null
  if (row.group_id) {
    const { data: g } = await supabase
      .from('member_groups')
      .select('id, name, color')
      .eq('id', row.group_id)
      .single()
    if (g) group = g as { id: string; name: string; color: string }
  }

  return { ...row, group, total_purchased, post_count: post_count ?? 0 }
}

export async function getMemberLoginInfo(id: string): Promise<MemberLoginInfo> {
  const supabase = await createClient()
  const [{ data: last }, { count }] = await Promise.all([
    supabase
      .from('login_logs')
      .select('created_at, ip')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('login_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),
  ])

  return {
    last_login_at: (last as { created_at: string | null } | null)?.created_at ?? null,
    last_login_ip: (last as { ip: string | null } | null)?.ip ?? null,
    login_count: count ?? 0,
  }
}

export type ProfileUpdate = {
  name?: string | null
  gender?: 'male' | 'female' | 'other' | null
  phone?: string | null
  homepage?: string | null
  address?: string | null
  zipcode?: string | null
  address_detail?: string | null
  birthdate?: string | null
  referrer?: string | null
}

export async function updateMemberProfile(id: string, patch: ProfileUpdate) {
  const supabase = await createClient()
  const update: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    update[k] = typeof v === 'string' ? (v.trim() || null) : v
  }
  const { error } = await supabase.from('profiles').update(update).eq('id', id)
  if (error) return { error: '회원 정보 저장 중 오류가 발생했습니다.' }
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${id}`)
  return { success: true }
}

export async function updateMemberMemo(id: string, memo: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ memo: memo.trim() || null })
    .eq('id', id)
  if (error) return { error: '메모 저장 중 오류가 발생했습니다.' }
  revalidatePath('/admin/members')
  return { success: true }
}

/**
 * 관리자가 회원 포인트를 수동 조정.
 * delta 양수 = 지급, 음수 = 회수.
 * 결과 잔액이 음수가 되지 않도록 cap.
 */
export async function adjustMemberPoints(memberId: string, delta: number, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  if (!Number.isInteger(delta) || delta === 0) {
    return { error: '조정 금액을 입력해주세요.' }
  }
  if (!reason.trim()) {
    return { error: '조정 사유를 입력해주세요.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', memberId)
    .single()
  if (!profile) return { error: '회원을 찾을 수 없습니다.' }

  const newBalance = (profile.points ?? 0) + delta
  if (newBalance < 0) {
    return { error: `잔액이 부족합니다. (보유 ${profile.points.toLocaleString()}P, 차감 ${Math.abs(delta).toLocaleString()}P)` }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ points: newBalance })
    .eq('id', memberId)
  if (updateError) return { error: `포인트 변경 실패: ${updateError.message}` }

  await supabase.from('point_history').insert({
    user_id: memberId,
    delta,
    balance_after: newBalance,
    reason: reason.trim(),
    source: delta > 0 ? 'admin_grant' : 'admin_revoke',
    created_by: user.id,
  })

  // 회원 알림
  await createNotification({
    userId: memberId,
    type: 'points_admin',
    title: delta > 0 ? `${delta.toLocaleString()}P 가 지급되었습니다` : `${Math.abs(delta).toLocaleString()}P 가 회수되었습니다`,
    body: reason.trim(),
    href: '/mypage/points',
  })

  revalidatePath('/admin/members')
  return { success: true, newBalance }
}

export async function getMemberPointHistory(memberId: string, limit = 50): Promise<PointHistoryEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('point_history')
    .select('id, delta, balance_after, reason, source, order_id, created_at')
    .eq('user_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as PointHistoryEntry[]
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
