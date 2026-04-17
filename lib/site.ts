import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Banner, SiteDesign, LayoutSection } from '@/lib/types/design'
import { resolveLayout } from '@/lib/default-layout'

export type SiteConfig = {
  id: string
  domain: string
  name: string
  description: string | null
  logo_url: string | null
  footer_info: Record<string, string>
}

export type SiteConfigFull = SiteConfig & {
  design: SiteDesign | null
  banners: Banner[]
  layout: LayoutSection[]
}

const FALLBACK_SITE: SiteConfig = {
  id: '',
  domain: 'localhost:3000',
  name: 'LUNAVALLEY',
  description: '명품 레플리카 전문 사이트',
  logo_url: null,
  footer_info: {},
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'

  const supabase = await createClient()
  const { data } = await supabase
    .from('sites')
    .select('*')
    .eq('domain', host)
    .single()

  if (data) return data as SiteConfig

  // 도메인 매칭 실패 시 첫 번째 사이트 반환
  const { data: fallback } = await supabase
    .from('sites')
    .select('*')
    .limit(1)
    .single()

  return (fallback as SiteConfig) ?? FALLBACK_SITE
}

export async function getSiteConfigFull(): Promise<SiteConfigFull> {
  const site = await getSiteConfig()

  if (!site.id) {
    return {
      ...site,
      design: null,
      banners: [],
      layout: resolveLayout(null, []),
    }
  }

  const supabase = await createClient()

  const [designResult, bannersResult] = await Promise.all([
    supabase
      .from('site_design')
      .select('*')
      .eq('site_id', site.id)
      .single(),
    supabase
      .from('banners')
      .select('*')
      .eq('site_id', site.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const design = (designResult.data as SiteDesign) ?? null
  const banners = (bannersResult.data ?? []) as Banner[]

  return {
    ...site,
    design,
    banners,
    layout: resolveLayout(design, banners),
  }
}
