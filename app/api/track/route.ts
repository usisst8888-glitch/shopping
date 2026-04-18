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

  // page_stats upsert - 1번의 DB 호출로 처리
  await supabase.from('page_stats').upsert(
    {
      site_id: siteId,
      date: today,
      path,
      page_views: 1,
      visitors: 1,
      visitor_ips: [ip],
    },
    { onConflict: 'site_id,date,path' }
  )

  return NextResponse.json({ ok: true })
}
