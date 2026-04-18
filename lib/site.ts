import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Banner, SiteDesign, LayoutSection } from '@/lib/types/design'
import { resolveLayout } from '@/lib/default-layout'
import { cache } from 'react'

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

// React cache: 같은 요청 내 중복 호출 방지
export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'

  const supabase = await createClient()
  const { data } = await supabase
    .from('sites')
    .select('*')
    .eq('domain', host)
    .single()

  if (data) return data as SiteConfig

  const { data: fallback } = await supabase
    .from('sites')
    .select('*')
    .limit(1)
    .single()

  return (fallback as SiteConfig) ?? FALLBACK_SITE
})

export const getSiteConfigFull = cache(async (): Promise<SiteConfigFull> => {
  const site = await getSiteConfig()

  if (!site.id) {
    return { ...site, design: null, banners: [], layout: resolveLayout(null, []) }
  }

  const supabase = await createClient()

  // 디자인 + 배너를 병렬로 가져옴
  const [designResult, bannersResult] = await Promise.all([
    supabase.from('site_design').select('*').eq('site_id', site.id).single(),
    supabase.from('banners').select('*').eq('site_id', site.id).eq('is_active', true).order('sort_order', { ascending: true }),
  ])

  const design = (designResult.data as SiteDesign) ?? null
  const banners = (bannersResult.data ?? []) as Banner[]

  return {
    ...site,
    design,
    banners,
    layout: resolveLayout(design, banners),
  }
})

// 카테고리 (헤더용) - React cache로 같은 요청 내 중복 방지
export const getCachedCategories = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, level')
    .lte('level', 2)
    .order('level')
    .order('sort_order')
  return data ?? []
})
