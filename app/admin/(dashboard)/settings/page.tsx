import { getSites, getBlockedIps } from './actions'
import { SiteManager } from './site-manager'
import { CommerceSettings } from './commerce-settings'
import { BlockedIpsManager } from './blocked-ips-manager'
import { getAdminSiteId } from '@/lib/admin-site'

export const metadata = { title: '설정' }

export default async function SettingsPage() {
  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)
  const currentSite = sites.find((s) => s.id === currentSiteId) ?? sites[0]
  const blockedIps = await getBlockedIps()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">설정</h1>
      {currentSite && <CommerceSettings site={currentSite} />}
      <BlockedIpsManager initial={blockedIps} />
      <SiteManager sites={sites} />
    </div>
  )
}
