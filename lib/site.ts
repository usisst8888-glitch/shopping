import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Banner, SiteDesign, LayoutSection } from '@/lib/types/design'
import { resolveLayout } from '@/lib/default-layout'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

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
  description: '',
  logo_url: null,
  footer_info: {},
}

// 사이트 설정을 60초간 캐싱 (모든 요청에서 공유)
const getCachedSiteByDomain = unstable_cache(
  async (domain: string) => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('sites')
      .select('*')
      .eq('domain', domain)
      .single()

    if (data) return data as SiteConfig

    const { data: fallback } = await supabase
      .from('sites')
      .select('*')
      .limit(1)
      .single()

    return (fallback as SiteConfig) ?? FALLBACK_SITE
  },
  ['site-config'],
  { revalidate: 60 }
)

// 사이트 디자인+배너를 60초간 캐싱
const getCachedSiteDesign = unstable_cache(
  async (siteId: string) => {
    const supabase = await createClient()

    const [designResult, bannersResult] = await Promise.all([
      supabase.from('site_design').select('*').eq('site_id', siteId).single(),
      supabase.from('banners').select('*').eq('site_id', siteId).eq('is_active', true).order('sort_order', { ascending: true }),
    ])

    return {
      design: (designResult.data as SiteDesign) ?? null,
      banners: (bannersResult.data ?? []) as Banner[],
    }
  },
  ['site-design'],
  { revalidate: 60 }
)

// 카테고리를 120초간 캐싱
export const getCachedCategories = unstable_cache(
  async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, level')
      .lte('level', 2)
      .order('level')
      .order('sort_order')
    return data ?? []
  },
  ['categories-header'],
  { revalidate: 120 }
)

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  return getCachedSiteByDomain(host)
})

export const getSiteConfigFull = cache(async (): Promise<SiteConfigFull> => {
  const site = await getSiteConfig()

  if (!site.id) {
    return { ...site, design: null, banners: [], layout: resolveLayout(null, []) }
  }

  const { design, banners } = await getCachedSiteDesign(site.id)

  return {
    ...site,
    design,
    banners,
    layout: resolveLayout(design, banners),
  }
})
