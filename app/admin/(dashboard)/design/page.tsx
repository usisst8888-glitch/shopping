import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getAdminSiteId } from '@/lib/admin-site'
import { getDesign, getBanners } from './actions'
import { resolveLayout } from '@/lib/default-layout'
import { DesignTabs } from './design-tabs'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '디자인 관리' }

export default async function DesignPage() {
  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)

  if (!currentSiteId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">디자인 관리</h1>
        <p className="text-sm text-zinc-500">
          사이드바에서 사이트를 선택하거나, 설정에서 사이트를 먼저 등록해주세요.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const [design, banners] = await Promise.all([
    getDesign(currentSiteId),
    getBanners(currentSiteId),
  ])

  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, level, parent_id')
    .order('level')
    .order('sort_order')

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">디자인 관리</h1>
      <DesignTabs
        siteId={currentSiteId}
        design={design}
        banners={banners}
        layout={resolveLayout(design, banners)}
        categories={allCategories ?? []}
      />
    </div>
  )
}
