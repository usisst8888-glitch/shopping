'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Inquiry, InquiryMessage, InquiryStatus } from '@/lib/types/inquiry'
import { createNotification } from '@/lib/notifications-server'

export type AdminInquiryListItem = Inquiry & {
  user_name: string | null
  user_email: string | null
  message_count: number
}

export type AdminInquiryListParams = {
  page: number
  size: number
  search?: string
  status?: InquiryStatus | 'all'
}

export async function getAdminInquiries(params: AdminInquiryListParams): Promise<{ list: AdminInquiryListItem[]; total: number }> {
  const supabase = await createClient()
  const { page, size, search, status } = params

  let query = supabase.from('inquiries').select('*', { count: 'exact' })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (search?.trim()) {
    query = query.ilike('subject', `%${search.trim()}%`)
  }

  const offset = (page - 1) * size
  const { data, count } = await query
    .order('last_activity_at', { ascending: false })
    .range(offset, offset + size - 1)

  const list = (data ?? []) as Inquiry[]
  if (list.length === 0) return { list: [], total: count ?? 0 }

  // 작성자 정보
  const userIds = [...new Set(list.map((i) => i.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds)
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]))

  // 메시지 갯수
  const inquiryIds = list.map((i) => i.id)
  const { data: msgs } = await supabase
    .from('inquiry_messages')
    .select('inquiry_id')
    .in('inquiry_id', inquiryIds)
  const counts = new Map<string, number>()
  for (const m of msgs ?? []) {
    counts.set(m.inquiry_id, (counts.get(m.inquiry_id) ?? 0) + 1)
  }

  return {
    list: list.map((i) => ({
      ...i,
      user_name: pmap.get(i.user_id)?.name ?? null,
      user_email: pmap.get(i.user_id)?.email ?? null,
      message_count: counts.get(i.id) ?? 0,
    })),
    total: count ?? 0,
  }
}

export async function getAdminInquiryDetail(id: string): Promise<
  | (Inquiry & {
      messages: InquiryMessage[]
      user_name: string | null
      user_email: string | null
    })
  | null
> {
  const supabase = await createClient()
  const { data: inquiry } = await supabase.from('inquiries').select('*').eq('id', id).single()
  if (!inquiry) return null
  const { data: messages } = await supabase
    .from('inquiry_messages')
    .select('*')
    .eq('inquiry_id', id)
    .order('created_at', { ascending: true })
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', inquiry.user_id)
    .single()
  return {
    ...(inquiry as Inquiry),
    messages: (messages ?? []) as InquiryMessage[],
    user_name: profile?.name ?? null,
    user_email: profile?.email ?? null,
  }
}

export async function postAdminReply(inquiryId: string, body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 관리자 권한 확인
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '관리자 권한이 필요합니다.' }

  if (!body.trim()) return { error: '내용을 입력해주세요.' }

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('id, user_id, subject, status')
    .eq('id', inquiryId)
    .single()
  if (!inquiry) return { error: '문의를 찾을 수 없습니다.' }
  if (inquiry.status === 'closed') return { error: '종료된 문의는 답변할 수 없습니다.' }

  const { error } = await supabase.from('inquiry_messages').insert({
    inquiry_id: inquiryId,
    author_id: user.id,
    author_role: 'admin',
    body: body.trim(),
  })
  if (error) return { error: `답변 등록 실패: ${error.message}` }

  await supabase
    .from('inquiries')
    .update({
      status: 'answered',
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', inquiryId)

  // 회원 알림
  await createNotification({
    userId: inquiry.user_id,
    type: 'inquiry_reply',
    title: '문의에 답변이 등록되었습니다',
    body: inquiry.subject,
    href: `/mypage/inquiry/${inquiry.id}`,
  })

  revalidatePath(`/admin/inquiries/${inquiryId}`)
  revalidatePath('/admin/inquiries')
  revalidatePath(`/mypage/inquiry/${inquiryId}`)
  revalidatePath('/mypage/inquiry')
  return { success: true }
}

export async function setInquiryStatus(inquiryId: string, status: InquiryStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: '관리자 권한이 필요합니다.' }

  const { error } = await supabase
    .from('inquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', inquiryId)
  if (error) return { error: `상태 변경 실패: ${error.message}` }

  revalidatePath(`/admin/inquiries/${inquiryId}`)
  revalidatePath('/admin/inquiries')
  return { success: true }
}
