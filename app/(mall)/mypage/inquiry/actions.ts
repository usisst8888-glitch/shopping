'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InquiryCategory, Inquiry, InquiryMessage } from '@/lib/types/inquiry'

export async function getMyInquiries(): Promise<Inquiry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('inquiries')
    .select('*')
    .eq('user_id', user.id)
    .order('last_activity_at', { ascending: false })
  return (data ?? []) as Inquiry[]
}

export async function getInquiryWithMessages(id: string): Promise<
  { inquiry: Inquiry; messages: InquiryMessage[] } | null
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .single()
  if (!inquiry) return null
  // 본인 또는 admin 만
  if (inquiry.user_id !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return null
  }

  const { data: messages } = await supabase
    .from('inquiry_messages')
    .select('*')
    .eq('inquiry_id', id)
    .order('created_at', { ascending: true })

  return { inquiry: inquiry as Inquiry, messages: (messages ?? []) as InquiryMessage[] }
}

export async function createInquiry(input: {
  category: InquiryCategory
  subject: string
  body: string
  relatedOrderId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (!input.subject.trim()) return { error: '제목을 입력해주세요.' }
  if (!input.body.trim()) return { error: '문의 내용을 입력해주세요.' }

  const { data: site } = await supabase.from('sites').select('id').limit(1).single()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      site_id: site?.id ?? null,
      user_id: user.id,
      category: input.category,
      subject: input.subject.trim(),
      related_order_id: input.relatedOrderId || null,
      status: 'open',
      last_activity_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !inquiry) return { error: `문의 생성 실패: ${error?.message ?? '알 수 없는 오류'}` }

  // 첫 메시지 저장
  await supabase.from('inquiry_messages').insert({
    inquiry_id: inquiry.id,
    author_id: user.id,
    author_role: 'user',
    body: input.body.trim(),
  })

  revalidatePath('/mypage/inquiry')
  revalidatePath('/admin/inquiries')
  return { success: true, inquiryId: inquiry.id }
}

export async function postUserReply(inquiryId: string, body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  if (!body.trim()) return { error: '내용을 입력해주세요.' }

  // 본인 문의인지 확인
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('id, user_id, status')
    .eq('id', inquiryId)
    .single()
  if (!inquiry || inquiry.user_id !== user.id) return { error: '권한이 없습니다.' }
  if (inquiry.status === 'closed') return { error: '종료된 문의는 답변할 수 없습니다.' }

  const { error } = await supabase.from('inquiry_messages').insert({
    inquiry_id: inquiryId,
    author_id: user.id,
    author_role: 'user',
    body: body.trim(),
  })
  if (error) return { error: `메시지 작성 실패: ${error.message}` }

  // 상태: answered 였으면 open 으로 (재문의)
  const newStatus = inquiry.status === 'answered' ? 'open' : inquiry.status
  await supabase
    .from('inquiries')
    .update({
      status: newStatus,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', inquiryId)

  revalidatePath(`/mypage/inquiry/${inquiryId}`)
  revalidatePath('/mypage/inquiry')
  revalidatePath(`/admin/inquiries/${inquiryId}`)
  revalidatePath('/admin/inquiries')
  return { success: true }
}

export async function closeInquiry(inquiryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('user_id')
    .eq('id', inquiryId)
    .single()
  if (!inquiry || inquiry.user_id !== user.id) return { error: '권한이 없습니다.' }

  await supabase
    .from('inquiries')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', inquiryId)
  revalidatePath(`/mypage/inquiry/${inquiryId}`)
  revalidatePath('/mypage/inquiry')
  revalidatePath('/admin/inquiries')
  return { success: true }
}

export async function deleteInquiry(inquiryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('user_id')
    .eq('id', inquiryId)
    .single()
  if (!inquiry || inquiry.user_id !== user.id) return { error: '권한이 없습니다.' }

  await supabase.from('inquiries').delete().eq('id', inquiryId)
  revalidatePath('/mypage/inquiry')
  revalidatePath('/admin/inquiries')
  redirect('/mypage/inquiry')
}
