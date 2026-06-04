'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { uploadToCloudflare } from '@/lib/cloudflare-images'

export type LayerPopup = {
  id: string
  site_id: string
  title: string
  image_url: string
  link_url: string | null
  position: string
  width: number
  is_active: boolean
  sort_order: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

export async function getPopups(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('layer_popups')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order')
  return (data ?? []) as LayerPopup[]
}

export async function createPopup(siteId: string, formData: FormData) {
  const supabase = await createClient()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: '제목을 입력하세요.' }

  const file = formData.get('image') as File
  if (!file || file.size === 0) return { error: '이미지를 선택하세요.' }

  const upload = await uploadToCloudflare(file)
  if (upload.error) return { error: upload.error }

  const linkUrl = (formData.get('link_url') as string)?.trim() || null
  const position = (formData.get('position') as string) || 'center'
  const width = parseInt(formData.get('width') as string) || 400
  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null

  const { error } = await supabase.from('layer_popups').insert({
    site_id: siteId,
    title,
    image_url: upload.url,
    link_url: linkUrl,
    position,
    width,
    start_date: startDate || null,
    end_date: endDate || null,
  })

  if (error) return { error: '팝업 생성 중 오류가 발생했습니다.' }

  revalidatePath('/admin/popups')
  revalidatePath('/')
  return { success: true }
}

export async function updatePopup(id: string, formData: FormData) {
  const supabase = await createClient()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: '제목을 입력하세요.' }

  const updates: Record<string, unknown> = {
    title,
    link_url: (formData.get('link_url') as string)?.trim() || null,
    position: (formData.get('position') as string) || 'center',
    width: parseInt(formData.get('width') as string) || 400,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
  }

  const file = formData.get('image') as File
  if (file && file.size > 0) {
    const upload = await uploadToCloudflare(file)
    if (upload.error) return { error: upload.error }
    updates.image_url = upload.url
  }

  const { error } = await supabase.from('layer_popups').update(updates).eq('id', id)
  if (error) return { error: '팝업 수정 중 오류가 발생했습니다.' }

  revalidatePath('/admin/popups')
  revalidatePath('/')
  return { success: true }
}

export async function deletePopup(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('layer_popups').delete().eq('id', id)
  if (error) return { error: '팝업 삭제 중 오류가 발생했습니다.' }

  revalidatePath('/admin/popups')
  revalidatePath('/')
  return { success: true }
}

export async function togglePopupActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('layer_popups').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: '상태 변경 중 오류가 발생했습니다.' }

  revalidatePath('/admin/popups')
  revalidatePath('/')
  return { success: true }
}
