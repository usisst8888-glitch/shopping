'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Site } from '@/app/admin/(dashboard)/settings/actions'

export function SiteSelector({
  sites,
  currentSiteId,
}: {
  sites: Site[]
  currentSiteId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('siteId', e.target.value)
    router.push(`?${params.toString()}`)
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
        등록된 사이트가 없습니다.{' '}
        <a href="/admin/settings" className="font-medium underline">
          설정에서 사이트를 추가
        </a>
        해주세요.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-zinc-700">사이트 선택</label>
      <select
        value={currentSiteId}
        onChange={handleChange}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name} ({site.domain})
          </option>
        ))}
      </select>
    </div>
  )
}
