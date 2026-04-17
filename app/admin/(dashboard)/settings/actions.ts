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
  created_at: string
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
