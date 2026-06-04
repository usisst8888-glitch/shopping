import { redirect } from 'next/navigation'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getAdminSiteId } from '@/lib/admin-site'
import { getMemberSettings } from './config'
import { MemberSettingsForm } from './member-settings-form'

export const metadata = { title: '회원 설정' }

export default async function MemberSettingsPage() {
  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)
  const currentSite = sites.find((s) => s.id === currentSiteId) ?? sites[0]
  if (!currentSite) redirect('/admin/settings')

  const settings = getMemberSettings(currentSite)

  return <MemberSettingsForm siteId={currentSite.id} initial={settings} />
}
