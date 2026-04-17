import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function trackPageView(siteId: string, path?: string) {
  if (!siteId) return

  const supabase = await createClient()
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const today = new Date().toISOString().slice(0, 10)

  // daily_stats 업데이트 (기존 사이트 전체 통계)
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('id, page_views, visitor_ips')
    .eq('site_id', siteId)
    .eq('date', today)
    .single()

  if (existing) {
    const visitorIps: string[] = existing.visitor_ips ?? []
    const isNewVisitor = !visitorIps.includes(ip)

    await supabase
      .from('daily_stats')
      .update({
        page_views: existing.page_views + 1,
        ...(isNewVisitor
          ? {
              visitors: visitorIps.length + 1,
              visitor_ips: [...visitorIps, ip],
            }
          : {}),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('daily_stats').insert({
      site_id: siteId,
      date: today,
      page_views: 1,
      visitors: 1,
      visitor_ips: [ip],
    })
  }

  // page_stats 업데이트 (페이지별 통계, IP 중복 차단)
  if (path) {
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
  }
}
