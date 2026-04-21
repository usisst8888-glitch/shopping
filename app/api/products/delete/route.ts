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

  for (const id of ids) {
    // 이미지 정보 가져오기
    const { data: product } = await supabase
      .from('products')
      .select('thumbnail_url, sub_images, summary, description')
      .eq('id', id)
      .single()

    // DB에서 삭제
    await supabase.from('products').delete().eq('id', id)

    // Cloudflare 이미지 삭제
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
      for (const url of uniqueUrls) {
        await deleteFromCloudflare(url)
      }
    }
  }

  revalidatePath('/admin/products')
  return NextResponse.json({ ok: true, deleted: ids.length })
}
