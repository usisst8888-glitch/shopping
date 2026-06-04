import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteFromCloudflare } from '@/lib/cloudflare-images'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const { ids } = await request.json() as { ids: string[] }
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: 'ID가 없습니다.' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1) 삭제 대상의 이미지 URL을 모두 수집 (DB 삭제 전)
  const collected = new Map<string, string[]>()
  for (const id of ids) {
    const { data: product } = await supabase
      .from('products')
      .select('thumbnail_url, sub_images, summary, description')
      .eq('id', id)
      .single()
    if (!product) continue

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
    collected.set(id, [...new Set(imageUrls)])
  }

  // 2) DB 삭제
  await supabase.from('products').delete().in('id', ids)

  // 3) 살아있는 다른 상품들이 같은 URL을 쓰고 있는지 확인 → 사용 중이면 cloudflare 삭제 skip
  const { data: remaining } = await supabase
    .from('products')
    .select('thumbnail_url, sub_images, summary, description')
  const inUse = new Set<string>()
  for (const row of remaining ?? []) {
    if (row.thumbnail_url) inUse.add(row.thumbnail_url)
    for (const u of (row.sub_images ?? []) as string[]) inUse.add(u)
    for (const body of [row.summary, row.description]) {
      if (!body) continue
      const m = (body as string).match(/https:\/\/imagedelivery\.net\/[^"'\s)]+/g)
      if (m) for (const u of m) inUse.add(u)
    }
  }

  // 4) 안전하게 삭제 가능한 URL만 cloudflare 삭제
  const toDelete = new Set<string>()
  for (const urls of collected.values()) {
    for (const u of urls) {
      if (!inUse.has(u)) toDelete.add(u)
    }
  }
  if (toDelete.size > 0) {
    await Promise.allSettled([...toDelete].map((u) => deleteFromCloudflare(u)))
  }

  revalidatePath('/admin/products')
  return NextResponse.json({ ok: true, deleted: ids.length })
}
