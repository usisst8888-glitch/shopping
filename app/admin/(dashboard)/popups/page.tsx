import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getAdminSiteId } from '@/lib/admin-site'
import { getPopups } from './actions'
import { PopupManager } from './popup-manager'

export const metadata = { title: '레이어 팝업 관리' }

export default async function PopupsPage() {
  const sites = await getSites()
  const siteId = await getAdminSiteId(sites)

  if (!siteId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">레이어 팝업 관리</h1>
        <p className="text-sm text-zinc-500">사이트를 먼저 등록해주세요.</p>
      </div>
    )
  }

  const popups = await getPopups(siteId)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">레이어 팝업 관리</h1>
      <PopupManager siteId={siteId} initialPopups={popups} />
    </div>
  )
}
