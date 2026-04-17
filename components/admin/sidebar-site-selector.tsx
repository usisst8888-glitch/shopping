'use client'

import { useRouter } from 'next/navigation'
import type { Site } from '@/app/admin/(dashboard)/settings/actions'
import { setAdminSiteId } from '@/lib/admin-site'

export function SidebarSiteSelector({
  sites,
  currentSiteId,
}: {
  sites: Site[]
  currentSiteId: string
}) {
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await setAdminSiteId(e.target.value)
    router.refresh()
  }

  if (sites.length === 0) {
    return (
      <p className="px-3 text-xs text-zinc-500">
        사이트를 먼저 등록해주세요
      </p>
    )
  }

  return (
    <select
      value={currentSiteId}
      onChange={handleChange}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
    >
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.name}
        </option>
      ))}
    </select>
  )
}
