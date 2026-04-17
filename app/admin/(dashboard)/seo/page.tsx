import { getAdminSiteId } from '@/lib/admin-site'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getSeoSettings } from './actions'
import { SeoManager } from './seo-manager'

export default async function SeoPage() {
  const sites = await getSites()
  const siteId = await getAdminSiteId(sites)

  const seo = await getSeoSettings(siteId)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">SEO 설정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          검색엔진 최적화 및 소셜 공유 설정을 관리합니다.
        </p>
      </div>

      <SeoManager siteId={siteId} seo={seo} />
    </div>
  )
}
