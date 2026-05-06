import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryNos = searchParams.get('nos')?.split(',') ?? []
  const offset = parseInt(searchParams.get('offset') ?? '0') || 0
  const limit = parseInt(searchParams.get('limit') ?? '40') || 40

  if (categoryNos.length === 0) {
    return NextResponse.json({ products: [], hasMore: false })
  }

  const supabase = await createClient()

  const { data, count } = await supabase
    .from('products')
    .select('id, name, slug, price, thumbnail_url', { count: 'exact' })
    .overlaps('category_nos', categoryNos)
    .eq('is_active', true)
    .order('product_no', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({
    products: data ?? [],
    hasMore: (count ?? 0) > offset + limit,
    total: count ?? 0,
  })
}
