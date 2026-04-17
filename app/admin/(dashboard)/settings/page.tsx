import { getSites } from './actions'
import { SiteManager } from './site-manager'

export const metadata = { title: '설정' }

export default async function SettingsPage() {
  const sites = await getSites()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">사이트 관리</h1>
      <SiteManager sites={sites} />
    </div>
  )
}
