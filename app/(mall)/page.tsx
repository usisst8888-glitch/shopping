import { getSiteConfigFull } from '@/lib/site'
import { LayoutRenderer } from '@/components/mall/layout-renderer'
import { resolveLayout } from '@/lib/default-layout'
import { createClient } from '@/lib/supabase/server'
import type { LayoutSection } from '@/lib/types/design'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const params = await searchParams
  const isPreviewDraft = params.preview === 'draft'

  const site = await getSiteConfigFull()

  // 미리보기(draft) 모드면 site_design.homepage_layout_draft 를 사용해 즉시 반영
  let layout = site.layout
  if (isPreviewDraft && site.id) {
    const supabase = await createClient()
    const { data: row } = await supabase
      .from('site_design')
      .select('homepage_layout_draft')
      .eq('site_id', site.id)
      .single()
    const draft = (row as { homepage_layout_draft?: LayoutSection[] | null } | null)?.homepage_layout_draft
    if (draft && draft.length > 0) {
      layout = resolveLayout(
        { ...(site.design ?? null), homepage_layout: draft } as Parameters<typeof resolveLayout>[0],
        site.banners,
      )
    }
  }

  return (
    <LayoutRenderer
      layout={layout}
      banners={site.banners}
      design={site.design}
      siteName={site.name}
      description={site.description}
    />
  )
}
