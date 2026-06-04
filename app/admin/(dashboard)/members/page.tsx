import { getMembers } from './actions'
import { getGroups } from './groups/actions'
import { getMemberSettings } from './settings/config'
import { MembersTable } from './members-table'
import { GroupsSidebar } from './groups-sidebar'
import { getAdminSiteId } from '@/lib/admin-site'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'

export const metadata = { title: '회원 관리' }

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; group?: string }>
}) {
  const params = await searchParams
  const search = params.search ?? ''
  const groupFilter = params.group ?? 'all'

  const [allMembers, groups] = await Promise.all([getMembers(search), getGroups()])
  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)
  const currentSite = sites.find((s) => s.id === currentSiteId) ?? sites[0]
  const memberSettings = currentSite ? getMemberSettings(currentSite) : null

  // 그룹 필터링은 서버사이드에서 처리
  const members = allMembers.filter((m) => {
    if (groupFilter === 'all') return true
    if (groupFilter === 'none') return !m.group_id
    return m.group_id === groupFilter
  })
  const noneCount = allMembers.filter((m) => !m.group_id).length

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <GroupsSidebar groups={groups} totalMembers={allMembers.length} noneCount={noneCount} />

      <div>
        {/* 검색 */}
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <form method="GET" action="/admin/members" className="flex gap-3">
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="이메일로 검색..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            {/* 그룹 필터를 검색해도 유지 */}
            {groupFilter !== 'all' && (
              <input type="hidden" name="group" value={groupFilter} />
            )}
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              검색
            </button>
            {search && (
              <a
                href={`/admin/members${groupFilter !== 'all' ? `?group=${groupFilter}` : ''}`}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                초기화
              </a>
            )}
          </form>
        </div>

        <MembersTable members={members} settings={memberSettings} groups={groups} />
      </div>
    </div>
  )
}
