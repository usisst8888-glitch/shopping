'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Post = {
  id: string
  board_id: string
  title: string
  content: string | null
  author_name: string | null
  category: string | null
  is_notice: boolean
  is_published: boolean
  like_count: number
  view_count: number
  created_at: string
  board_name?: string
}

export type PostsFilter = {
  siteId: string
  page?: number
  size?: number
  search?: string
  boardId?: string
}

export type BoardCount = { id: string; name: string; slug: string; count: number }

// 사이트의 게시판 목록 + 게시판별 게시물 수 (+ 전체)
export async function getBoardCounts(siteId: string): Promise<{ boards: BoardCount[]; total: number }> {
  const supabase = await createClient()
  const { data: boards } = await supabase
    .from('boards')
    .select('id, name, slug')
    .eq('site_id', siteId)
    .order('sort_order')
    .order('created_at')

  const list = boards ?? []
  const boardIds = list.map((b) => b.id)

  const counts = await Promise.all(
    list.map(async (b) => {
      const { count } = await supabase
        .from('board_posts')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', b.id)
      return { id: b.id, name: b.name, slug: b.slug, count: count ?? 0 }
    }),
  )

  let total = 0
  if (boardIds.length > 0) {
    const { count } = await supabase
      .from('board_posts')
      .select('id', { count: 'exact', head: true })
      .in('board_id', boardIds)
    total = count ?? 0
  }

  return { boards: counts, total }
}

export async function getPosts(filter: PostsFilter): Promise<{ posts: Post[]; total: number; page: number; size: number }> {
  const supabase = await createClient()
  const page = filter.page ?? 1
  const size = filter.size ?? 20
  const search = filter.search?.trim() ?? ''
  const boardId = filter.boardId ?? ''

  const { data: boards } = await supabase
    .from('boards')
    .select('id, name')
    .eq('site_id', filter.siteId)

  const boardMap = new Map((boards ?? []).map((b) => [b.id, b.name]))
  const boardIds = (boards ?? []).map((b) => b.id)
  if (boardIds.length === 0) return { posts: [], total: 0, page, size }

  let query = supabase.from('board_posts').select('*', { count: 'exact' })
  query = boardId ? query.eq('board_id', boardId) : query.in('board_id', boardIds)
  if (search) {
    query = query.or(`title.ilike.%${search}%,author_name.ilike.%${search}%`)
  }

  const from = (page - 1) * size
  const to = from + size - 1
  const { data, count } = await query
    .order('is_notice', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const posts = (data ?? []).map((p) => ({ ...p, board_name: boardMap.get(p.board_id) ?? '' })) as Post[]
  return { posts, total: count ?? 0, page, size }
}

export async function getPost(id: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('board_posts').select('*').eq('id', id).single()
  return (data as Post) ?? null
}

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const boardId = formData.get('board_id') as string
  const title = (formData.get('title') as string)?.trim()
  if (!boardId) return { error: '게시판을 선택하세요.' }
  if (!title) return { error: '제목을 입력하세요.' }

  const createdAtStr = (formData.get('created_at') as string)?.trim()
  const createdAtIso = createdAtStr ? new Date(createdAtStr).toISOString() : undefined

  const { error } = await supabase.from('board_posts').insert({
    board_id: boardId,
    title,
    content: (formData.get('content') as string) || null,
    author_name: (formData.get('author_name') as string)?.trim() || '관리자',
    category: (formData.get('category') as string)?.trim() || null,
    is_notice: formData.get('is_notice') === 'true',
    is_published: formData.get('is_published') !== 'false',
    like_count: Math.max(0, parseInt(formData.get('like_count') as string) || 0),
    view_count: Math.max(0, parseInt(formData.get('view_count') as string) || 0),
    ...(createdAtIso ? { created_at: createdAtIso } : {}),
  })

  if (error) return { error: '게시물 등록 중 오류가 발생했습니다.' }
  revalidatePath('/admin/posts')
  return { success: true }
}

export async function updatePost(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const boardId = formData.get('board_id') as string
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: '제목을 입력하세요.' }

  const { error } = await supabase
    .from('board_posts')
    .update({
      board_id: boardId,
      title,
      content: (formData.get('content') as string) || null,
      author_name: (formData.get('author_name') as string)?.trim() || '관리자',
      category: (formData.get('category') as string)?.trim() || null,
      is_notice: formData.get('is_notice') === 'true',
      is_published: formData.get('is_published') !== 'false',
      like_count: Math.max(0, parseInt(formData.get('like_count') as string) || 0),
      view_count: Math.max(0, parseInt(formData.get('view_count') as string) || 0),
      ...(((formData.get('created_at') as string)?.trim()) ? { created_at: new Date(formData.get('created_at') as string).toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: '게시물 수정 중 오류가 발생했습니다.' }
  revalidatePath('/admin/posts')
  return { success: true }
}

export async function togglePublish(id: string, isPublished: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('board_posts').update({ is_published: isPublished }).eq('id', id)
  if (error) return { error: '공개 상태 변경 중 오류가 발생했습니다.' }
  revalidatePath('/admin/posts')
  return { success: true }
}

export async function deletePost(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('board_posts').delete().eq('id', id)
  if (error) return { error: '게시물 삭제 중 오류가 발생했습니다.' }
  revalidatePath('/admin/posts')
  return { success: true }
}
