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
  board_categories: string[]
  banner_url: string | null
  banner_video_url: string | null
  show_view_count: boolean
  show_author_name: boolean
  // 구성 요소
  show_board_name: boolean
  show_total_count: boolean
  show_profile_image: boolean
  show_search: boolean
  image_lightbox: boolean
  // 리스트 항목
  show_created_time: boolean
  show_content_preview: boolean
  show_category: boolean
  show_comment_count: boolean
  show_like_count: boolean
  show_share: boolean
  show_print: boolean
  // 리스트 옵션
  image_ratio: string
  cols_desktop: number
  gap_px: number
  visible_rows: number
  cols_mobile: number
  keep_cols_on_expand: boolean
  // 텍스트
  title_font_size: number
  content_font_size: number
  padding_px: number
  content_preview_lines: number
  text_align: string
  title_color: string
  content_color: string
  // 배경/테두리
  border_radius: number
  border_width: number
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

function pickDesignFields(formData: FormData) {
  const b = (k: string, def: boolean) => {
    const v = formData.get(k)
    return v === 'true' ? true : v === 'false' ? false : def
  }
  const n = (k: string, def: number) => {
    const raw = formData.get(k) as string | null
    const parsed = raw ? parseInt(raw) : NaN
    return Number.isFinite(parsed) ? Math.max(0, parsed) : def
  }
  const s = (k: string, def: string) => (formData.get(k) as string)?.trim() || def
  return {
    show_board_name: b('show_board_name', true),
    show_total_count: b('show_total_count', false),
    show_profile_image: b('show_profile_image', false),
    show_search: b('show_search', false),
    image_lightbox: b('image_lightbox', true),
    show_created_time: b('show_created_time', true),
    show_content_preview: b('show_content_preview', true),
    show_category: b('show_category', true),
    show_comment_count: b('show_comment_count', false),
    show_like_count: b('show_like_count', false),
    show_share: b('show_share', false),
    show_print: b('show_print', false),
    image_ratio: s('image_ratio', '4:3'),
    cols_desktop: n('cols_desktop', 4),
    gap_px: n('gap_px', 30),
    visible_rows: n('visible_rows', 12),
    cols_mobile: n('cols_mobile', 2),
    keep_cols_on_expand: b('keep_cols_on_expand', true),
    title_font_size: n('title_font_size', 14),
    content_font_size: n('content_font_size', 12),
    padding_px: n('padding_px', 20),
    content_preview_lines: n('content_preview_lines', 1),
    text_align: s('text_align', 'left'),
    title_color: s('title_color', '#18181b'),
    content_color: s('content_color', '#71717a'),
    border_radius: n('border_radius', 0),
    border_width: n('border_width', 1),
  }
}

export async function createBoard(siteId: string, formData: FormData) {
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const boardType = (formData.get('board_type') as string) || 'list'
  let boardCategories: string[] = []
  try {
    boardCategories = JSON.parse(formData.get('board_categories') as string || '[]')
  } catch {}

  if (!name || !slug) return { error: '게시판명과 슬러그는 필수입니다.' }

  const { error } = await supabase.from('boards').insert({
    site_id: siteId,
    name,
    slug,
    description,
    board_type: boardType,
    board_categories: boardCategories,
    banner_url: (formData.get('banner_url') as string)?.trim() || null,
    banner_video_url: (formData.get('banner_video_url') as string)?.trim() || null,
    show_view_count: formData.get('show_view_count') !== 'false',
    show_author_name: formData.get('show_author_name') !== 'false',
    ...pickDesignFields(formData),
  })

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 슬러그입니다.' }
    return { error: '게시판 생성 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/boards')
  revalidatePath('/board/[slug]', 'page')
  return { success: true }
}

export async function updateBoard(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const boardType = (formData.get('board_type') as string) || 'list'
  const isActive = formData.get('is_active') === 'true'
  let boardCategories: string[] = []
  try {
    boardCategories = JSON.parse(formData.get('board_categories') as string || '[]')
  } catch {}

  const { error } = await supabase
    .from('boards')
    .update({
      name,
      slug,
      description,
      board_type: boardType,
      is_active: isActive,
      board_categories: boardCategories,
      banner_url: (formData.get('banner_url') as string)?.trim() || null,
      banner_video_url: (formData.get('banner_video_url') as string)?.trim() || null,
      show_view_count: formData.get('show_view_count') !== 'false',
      show_author_name: formData.get('show_author_name') !== 'false',
      ...pickDesignFields(formData),
    })
    .eq('id', id)

  if (error) return { error: '게시판 수정 중 오류가 발생했습니다.' }

  revalidatePath('/admin/boards')
  revalidatePath('/board/[slug]', 'page')
  return { success: true }
}

export async function deleteBoard(id: string) {
  const supabase = await createClient()
  await supabase.from('boards').delete().eq('id', id)
  revalidatePath('/admin/boards')
  revalidatePath('/board/[slug]', 'page')
  return { success: true }
}
