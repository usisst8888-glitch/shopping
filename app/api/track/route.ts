import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const { siteId, path } = await request.json()
  if (!siteId || !path) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const today = new Date().toISOString().slice(0, 10)

  const supabase = await createClient()

  const { data: pageStat } = await supabase
    .from('page_stats')
    .select('id, page_views, visitors, visitor_ips')
    .eq('site_id', siteId)
    .eq('date', today)
    .eq('path', path)
    .single()

  if (pageStat) {
    const pageIps: string[] = pageStat.visitor_ips ?? []
    const isNewPageVisitor = !pageIps.includes(ip)

    if (isNewPageVisitor) {
      await supabase
        .from('page_stats')
        .update({
          page_views: pageStat.page_views + 1,
          visitors: pageStat.visitors + 1,
          visitor_ips: [...pageIps, ip],
        })
        .eq('id', pageStat.id)
    }
  } else {
    await supabase.from('page_stats').insert({
      site_id: siteId,
      date: today,
      path,
      page_views: 1,
      visitors: 1,
      visitor_ips: [ip],
    })
  }

  return NextResponse.json({ ok: true })
}
