'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slug'

export type Product = {
  id: string
  name: string
  slug: string | null
  summary: string | null
  description: string | null
  price: number
  thumbnail_url: string | null
  sub_images: string[] | null
  category_nos: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
  categories?: { id: string; name: string; category_no: string | null }[]
}

export type ProductsFilter = {
  page?: number
  size?: number
  search?: string
  status?: 'all' | 'active' | 'hidden'
  categoryId?: string
}

export type ProductsResult = {
  products: Product[]
  total: number
  page: number
  size: number
}

export async function getProducts(filter?: ProductsFilter): Promise<ProductsResult> {
  const supabase = await createClient()

  const page = filter?.page ?? 1
  const size = filter?.size ?? 20
  const search = filter?.search?.trim() ?? ''
  const status = filter?.status ?? 'all'
  const categoryId = filter?.categoryId ?? ''

  // 카테고리 필터가 있으면 해당 카테고리의 상품 ID 먼저 조회
  let filteredProductIds: string[] | null = null
  if (categoryId) {
    const { data: relations } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', categoryId)
    filteredProductIds = (relations ?? []).map((r) => r.product_id)
    if (filteredProductIds.length === 0) {
      return { products: [], total: 0, page, size }
    }
  }

  let query = supabase.from('products').select('*', { count: 'exact' })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'hidden') {
    query = query.eq('is_active', false)
  }
  if (filteredProductIds) {
    query = query.in('id', filteredProductIds)
  }

  const from = (page - 1) * size
  const to = from + size - 1

  const { data: products, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error || !products) return { products: [], total: 0, page, size }

  // 각 상품의 카테고리 조회
  const productIds = products.map((p) => p.id)
  const { data: relations } = await supabase
    .from('product_categories')
    .select('product_id, category_id')
    .in('product_id', productIds)

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, category_no')

  const categoryMap = new Map(
    categories?.map((c) => [c.id, { name: c.name, category_no: c.category_no }]) ?? []
  )

  const result = products.map((product) => ({
    ...product,
    categories: (relations ?? [])
      .filter((r) => r.product_id === product.id)
      .map((r) => ({
        id: r.category_id,
        name: categoryMap.get(r.category_id)?.name ?? '',
        category_no: categoryMap.get(r.category_id)?.category_no ?? null,
      })),
  })) as Product[]

  return { products: result, total: count ?? 0, page, size }
}

export async function getAllCategoriesFlat() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, category_no, parent_id, level')
    .order('level')
    .order('sort_order')

  return data ?? []
}

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: '파일이 없습니다.' }

  const { uploadToCloudflare } = await import('@/lib/cloudflare-images')
  return uploadToCloudflare(file)
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const summary = formData.get('summary') as string
  const description = formData.get('description') as string
  const price = parseInt(formData.get('price') as string) || 0
  const thumbnailUrl = formData.get('thumbnail_url') as string
  const subImages = JSON.parse(formData.get('sub_images') as string || '[]') as string[]
  const categoryIds = JSON.parse(formData.get('category_ids') as string || '[]') as string[]

  // 선택된 카테고리들의 category_no를 모두 수집해서 저장
  let categoryNos: string[] = []
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from('categories')
      .select('category_no')
      .in('id', categoryIds)
      .not('category_no', 'is', null)
    categoryNos = (cats ?? [])
      .map((c) => c.category_no)
      .filter((v): v is string => !!v)
  }

  // slug 생성 (중복 시 숫자 추가)
  let slug = generateSlug(name)
  const { data: existing } = await supabase
    .from('products')
    .select('slug')
    .like('slug', `${slug}%`)
  if (existing && existing.length > 0) {
    slug = `${slug}-${existing.length + 1}`
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name,
      slug,
      summary,
      description,
      price,
      thumbnail_url: thumbnailUrl || null,
      sub_images: subImages,
      category_nos: categoryNos,
    })
    .select('id')
    .single()

  if (error || !product) {
    return { error: '상품 등록 중 오류가 발생했습니다.' }
  }

  // 카테고리 연결
  if (categoryIds.length > 0) {
    const relations = categoryIds.map((categoryId) => ({
      product_id: product.id,
      category_id: categoryId,
    }))

    await supabase.from('product_categories').insert(relations)
  }

  revalidatePath('/admin/products')
  return { success: true, id: product.id }
}

export async function getProduct(id: string) {
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !product) return null

  const { data: relations } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', id)

  return {
    ...product,
    category_ids: (relations ?? []).map((r) => r.category_id),
  } as Product & { category_ids: string[] }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const summary = formData.get('summary') as string
  const description = formData.get('description') as string
  const price = parseInt(formData.get('price') as string) || 0
  const thumbnailUrl = formData.get('thumbnail_url') as string
  const subImages = JSON.parse(formData.get('sub_images') as string || '[]') as string[]
  const categoryIds = JSON.parse(formData.get('category_ids') as string || '[]') as string[]

  let categoryNos: string[] = []
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from('categories')
      .select('category_no')
      .in('id', categoryIds)
      .not('category_no', 'is', null)
    categoryNos = (cats ?? [])
      .map((c) => c.category_no)
      .filter((v): v is string => !!v)
  }

  // 기존 상품의 slug 확인, 없으면 생성
  const { data: current } = await supabase
    .from('products')
    .select('slug, name')
    .eq('id', id)
    .single()

  let slug = current?.slug
  if (!slug || current?.name !== name) {
    slug = generateSlug(name)
    const { data: existing } = await supabase
      .from('products')
      .select('slug')
      .like('slug', `${slug}%`)
      .neq('id', id)
    if (existing && existing.length > 0) {
      slug = `${slug}-${existing.length + 1}`
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      name,
      slug,
      summary,
      description,
      price,
      thumbnail_url: thumbnailUrl || null,
      sub_images: subImages,
      category_nos: categoryNos,
    })
    .eq('id', id)

  if (error) {
    return { error: '상품 수정 중 오류가 발생했습니다.' }
  }

  await supabase.from('product_categories').delete().eq('product_id', id)
  if (categoryIds.length > 0) {
    const relations = categoryIds.map((categoryId) => ({
      product_id: id,
      category_id: categoryId,
    }))
    await supabase.from('product_categories').insert(relations)
  }

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${id}/edit`)
  return { success: true }
}

export async function moveProductCategories(productId: string, categoryIds: string[]) {
  const supabase = await createClient()

  // 기존 카테고리 연결 삭제
  await supabase.from('product_categories').delete().eq('product_id', productId)

  // 새 카테고리 연결
  if (categoryIds.length > 0) {
    const relations = categoryIds.map((categoryId) => ({
      product_id: productId,
      category_id: categoryId,
    }))
    await supabase.from('product_categories').insert(relations)

    // category_nos 업데이트
    const { data: cats } = await supabase
      .from('categories')
      .select('category_no')
      .in('id', categoryIds)
      .not('category_no', 'is', null)
    const categoryNos = (cats ?? [])
      .map((c) => c.category_no)
      .filter((v): v is string => !!v)

    await supabase
      .from('products')
      .update({ category_nos: categoryNos })
      .eq('id', productId)
  } else {
    await supabase
      .from('products')
      .update({ category_nos: [] })
      .eq('id', productId)
  }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: '상품 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
