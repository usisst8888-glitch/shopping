'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slug'

export type Category = {
  id: string
  category_no: string | null
  name: string
  parent_id: string | null
  level: number
  sort_order: number
  image_url: string | null
  is_main: boolean
  created_at: string
  children?: Category[]
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []

  // 플랫 리스트를 트리 구조로 변환
  return buildTree(data ?? [])
}

function buildTree(items: Category[]): Category[] {
  const map = new Map<string, Category>()
  const roots: Category[] = []

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export async function uploadCategoryImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: '파일이 없습니다.' }

  const { uploadToCloudflare } = await import('@/lib/cloudflare-images')
  return uploadToCloudflare(file)
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const categoryNo = (formData.get('category_no') as string)?.trim() || null
  const parentId = formData.get('parent_id') as string | null
  const sortOrder = parseInt(formData.get('sort_order') as string) || 0
  const imageUrl = (formData.get('image_url') as string)?.trim() || null
  const isMain = formData.get('is_main') === 'true'

  let level = 1
  if (parentId) {
    const { data: parent } = await supabase
      .from('categories')
      .select('level')
      .eq('id', parentId)
      .single()

    if (parent) {
      level = parent.level + 1
    }

    if (level > 4) {
      return { error: '4차 카테고리까지만 생성할 수 있습니다.' }
    }
  }

  let slug = generateSlug(name)
  const { data: existingSlugs } = await supabase
    .from('categories')
    .select('slug')
    .like('slug', `${slug}%`)
  if (existingSlugs && existingSlugs.length > 0) {
    slug = `${slug}-${existingSlugs.length + 1}`
  }

  const { error } = await supabase.from('categories').insert({
    name,
    slug,
    category_no: categoryNo,
    parent_id: parentId || null,
    level,
    sort_order: sortOrder,
    image_url: imageUrl,
    is_main: isMain,
  })

  if (error) {
    return { error: '카테고리 생성 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const categoryNo = (formData.get('category_no') as string)?.trim() || null
  const sortOrder = parseInt(formData.get('sort_order') as string) || 0
  const imageUrl = (formData.get('image_url') as string)?.trim() || null
  const isMain = formData.get('is_main') === 'true'

  // slug 업데이트
  const { data: current } = await supabase
    .from('categories')
    .select('slug, name')
    .eq('id', id)
    .single()

  let slug = current?.slug
  if (!slug || current?.name !== name) {
    slug = generateSlug(name)
    const { data: existingSlugs } = await supabase
      .from('categories')
      .select('slug')
      .like('slug', `${slug}%`)
      .neq('id', id)
    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${slug}-${existingSlugs.length + 1}`
    }
  }

  const { error } = await supabase
    .from('categories')
    .update({ name, slug, category_no: categoryNo, sort_order: sortOrder, image_url: imageUrl, is_main: isMain })
    .eq('id', id)

  if (error) {
    return { error: '카테고리 수정 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: '카테고리 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/categories')
  return { success: true }
}
