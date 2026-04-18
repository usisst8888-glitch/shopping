import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function trackPageView(siteId: string) {
  if (!siteId) return

  const supabase = await createClient()
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const today = new Date().toISOString().slice(0, 10)

  // daily_stats upsert - 1번의 DB 호출
  await supabase.from('daily_stats').upsert(
    {
      site_id: siteId,
      date: today,
      page_views: 1,
      visitors: 1,
      visitor_ips: [ip],
    },
    { onConflict: 'site_id,date' }
  )
}
