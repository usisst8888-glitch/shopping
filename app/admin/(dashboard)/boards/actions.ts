'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type BoardType = 'list' | 'gallery' | 'webzine'

export type Board = {
  id: string
  site_id: string
  name: string
  slug: string
  description: string | null
  board_type: BoardType
  sort_order: number
  is_active: boolean
  created_at: string
}

export async function getBoards(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('boards')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order')
    .order('created_at')

  return (data ?? []) as Board[]
}

export async function createBoard(siteId: string, formData: FormData) {
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const boardType = (formData.get('board_type') as string) || 'list'

  if (!name || !slug) return { error: '게시판명과 슬러그는 필수입니다.' }

  const { error } = await supabase.from('boards').insert({
    site_id: siteId,
    name,
    slug,
    description,
    board_type: boardType,
  })

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 슬러그입니다.' }
    return { error: '게시판 생성 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/boards')
  return { success: true }
}

export async function updateBoard(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const boardType = (formData.get('board_type') as string) || 'list'
  const isActive = formData.get('is_active') === 'true'

  const { error } = await supabase
    .from('boards')
    .update({ name, slug, description, board_type: boardType, is_active: isActive })
    .eq('id', id)

  if (error) return { error: '게시판 수정 중 오류가 발생했습니다.' }

  revalidatePath('/admin/boards')
  return { success: true }
}

export async function deleteBoard(id: string) {
  const supabase = await createClient()
  await supabase.from('boards').delete().eq('id', id)
  revalidatePath('/admin/boards')
  return { success: true }
}
