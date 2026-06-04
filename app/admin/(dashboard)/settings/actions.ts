'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Site = {
  id: string
  domain: string
  name: string
  description: string | null
  logo_url: string | null
  footer_info: Record<string, string>
  // 결제 / 배송 / 포인트 설정
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  shipping_fee: number
  free_shipping_threshold: number
  point_earn_rate: number
  point_min_balance: number
  point_min_order_amount: number
  created_at: string
}

export type CommerceSettings = {
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  shipping_fee: number
  free_shipping_threshold: number
  point_earn_rate: number
  point_min_balance: number
  point_min_order_amount: number
}

export async function updateSiteCommerce(id: string, settings: CommerceSettings) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sites')
    .update({
      bank_name: settings.bank_name?.trim() || null,
      bank_account_number: settings.bank_account_number?.trim() || null,
      bank_account_holder: settings.bank_account_holder?.trim() || null,
      shipping_fee: Math.max(0, settings.shipping_fee),
      free_shipping_threshold: Math.max(0, settings.free_shipping_threshold),
      point_earn_rate: Math.max(0, settings.point_earn_rate),
      point_min_balance: Math.max(0, settings.point_min_balance),
      point_min_order_amount: Math.max(0, settings.point_min_order_amount),
    })
    .eq('id', id)

  if (error) return { error: '결제·배송 설정 저장 중 오류가 발생했습니다.' }
  revalidatePath('/admin/settings')
  revalidatePath('/checkout')
  return { success: true }
}

export async function getSites() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sites')
    .select('*')
    .order('created_at', { ascending: true })

  return (data ?? []) as Site[]
}

export async function createSite(formData: FormData) {
  const supabase = await createClient()

  const domain = (formData.get('domain') as string).trim()
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim() || null

  if (!domain || !name) {
    return { error: '도메인과 사이트명은 필수입니다.' }
  }

  const { error } = await supabase
    .from('sites')
    .insert({ domain, name, description })

  if (error) {
    if (error.code === '23505') {
      return { error: '이미 등록된 도메인입니다.' }
    }
    return { error: '사이트 등록 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function updateSite(id: string, formData: FormData) {
  const supabase = await createClient()

  const domain = (formData.get('domain') as string).trim()
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim() || null

  if (!domain || !name) {
    return { error: '도메인과 사이트명은 필수입니다.' }
  }

  const { error } = await supabase
    .from('sites')
    .update({ domain, name, description })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: '이미 등록된 도메인입니다.' }
    }
    return { error: '사이트 수정 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteSite(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: '사이트 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ───── IP 차단 ─────

export type BlockedIp = {
  id: string
  ip: string
  reason: string | null
  created_at: string
}

export async function getBlockedIps(): Promise<BlockedIp[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blocked_ips')
    .select('id, ip, reason, created_at')
    .order('created_at', { ascending: false })
  return (data ?? []) as BlockedIp[]
}

export async function addBlockedIp(ip: string, reason?: string) {
  const v = ip.trim()
  if (!v) return { error: 'IP를 입력해주세요.' }
  const valid =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(v) ||
    /^[0-9a-fA-F:]+$/.test(v) ||
    /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(v)
  if (!valid) return { error: '올바른 IP 형식이 아닙니다. (예: 1.2.3.4)' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('blocked_ips').insert({
    ip: v,
    reason: reason?.trim() || null,
    created_by: user?.id ?? null,
  })
  if (error) {
    if (error.code === '23505') return { error: '이미 차단된 IP입니다.' }
    return { error: 'IP 차단 등록 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function removeBlockedIp(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('blocked_ips').delete().eq('id', id)
  if (error) return { error: 'IP 차단 해제 중 오류가 발생했습니다.' }
  revalidatePath('/admin/settings')
  return { success: true }
}
