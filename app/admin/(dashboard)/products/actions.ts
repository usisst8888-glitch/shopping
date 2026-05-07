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
  status?: 'all' | 'active' | 'soldout' | 'hidden'
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

  // 카테고리 필터: category_nos 기반
  let categoryNos: string[] | null = null
  if (categoryId) {
    const { data: cat } = await supabase
      .from('categories')
      .select('category_no')
      .eq('id', categoryId)
      .single()

    const { data: children } = await supabase
      .from('categories')
      .select('id, category_no')
      .eq('parent_id', categoryId)

    const childIds = (children ?? []).map((c) => c.id)
    let grandChildNos: string[] = []
    if (childIds.length > 0) {
      const { data: gc } = await supabase
        .from('categories')
        .select('category_no')
        .in('parent_id', childIds)
      grandChildNos = (gc ?? []).map((c) => c.category_no).filter(Boolean) as string[]
    }

    categoryNos = [
      cat?.category_no,
      ...(children ?? []).map((c) => c.category_no),
      ...grandChildNos,
    ].filter(Boolean) as string[]

    if (categoryNos.length === 0) {
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
  } else if (status === 'soldout') {
    query = query.eq('status', 'soldout')
  }
  if (categoryNos) {
    query = query.overlaps('category_nos', categoryNos)
  }

  const from = (page - 1) * size
  const to = from + size - 1

  const { data: products, count, error } = await query
    .order('product_no', { ascending: false, nullsFirst: false })
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
  if (file.size === 0) return { error: '빈 파일입니다.' }

  try {
    const { uploadToCloudflare } = await import('@/lib/cloudflare-images')
    const result = await uploadToCloudflare(file)
    return result
  } catch (err) {
    console.error('uploadImage 에러:', err)
    return { error: '이미지 업로드 중 서버 오류가 발생했습니다.' }
  }
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
  const status = (formData.get('status') as string) || 'active'
  const isActive = status === 'active'

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
      status,
      is_active: isActive,
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
  const status = (formData.get('status') as string) || 'active'
  const isActive = status === 'active'

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
      status,
      is_active: isActive,
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

export async function toggleProductActive(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    return { error: '상태 변경 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function updateProductStatus(id: string, status: string) {
  const supabase = await createClient()

  const isActive = status === 'active'
  const { error } = await supabase
    .from('products')
    .update({ status, is_active: isActive })
    .eq('id', id)

  if (error) {
    return { error: '상태 변경 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function duplicateProduct(id: string) {
  const supabase = await createClient()

  const { data: original } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!original) return { error: '원본 상품을 찾을 수 없습니다.' }

  const slug = generateSlug(original.name + '-복사')
  const { data: newProduct, error } = await supabase
    .from('products')
    .insert({
      name: original.name + ' (복사)',
      slug,
      summary: original.summary,
      description: original.description,
      price: original.price,
      thumbnail_url: original.thumbnail_url,
      sub_images: original.sub_images,
      category_nos: original.category_nos,
      status: 'hidden',
      is_active: false,
    })
    .select('id')
    .single()

  if (error) return { error: '상품 복제 중 오류가 발생했습니다.' }

  // 카테고리 연결 복제
  const { data: relations } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', id)

  if (relations && relations.length > 0 && newProduct) {
    await supabase.from('product_categories').insert(
      relations.map((r) => ({ product_id: newProduct.id, category_id: r.category_id }))
    )
  }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  // 상품 이미지 정보 먼저 가져오기
  const { data: product } = await supabase
    .from('products')
    .select('thumbnail_url, sub_images, summary, description')
    .eq('id', id)
    .single()

  // DB에서 상품 삭제
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: '상품 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/products')

  // Cloudflare 이미지 삭제 (백그라운드 - 클라이언트를 기다리게 하지 않음)
  if (product) {
    const imageUrls: string[] = []
    if (product.thumbnail_url) imageUrls.push(product.thumbnail_url)
    if (product.sub_images) imageUrls.push(...(product.sub_images as string[]))
    if (product.summary) {
      const m = product.summary.match(/https:\/\/imagedelivery\.net\/[^"'\s)]+/g)
      if (m) imageUrls.push(...m)
    }
    if (product.description) {
      const m = product.description.match(/https:\/\/imagedelivery\.net\/[^"'\s)]+/g)
      if (m) imageUrls.push(...m)
    }

    const uniqueUrls = [...new Set(imageUrls)]
    if (uniqueUrls.length > 0) {
      // fire-and-forget: 응답을 기다리지 않고 백그라운드에서 삭제
      import('@/lib/cloudflare-images').then(({ deleteFromCloudflare }) => {
        Promise.allSettled(uniqueUrls.map((url) => deleteFromCloudflare(url)))
      }).catch(() => {})
    }
  }

  return { success: true }
}
