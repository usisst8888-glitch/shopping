import { getAdminSiteId } from '@/lib/admin-site'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getBoards } from './actions'
import { BoardManager } from './board-manager'

export const metadata = { title: '게시판 관리' }

export default async function BoardsPage() {
  const sites = await getSites()
  const siteId = await getAdminSiteId(sites)
  const boards = await getBoards(siteId)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">게시판 관리</h1>
        <p className="mt-1 text-sm text-zinc-500">게시판을 추가하고 관리하세요.</p>
      </div>
      <BoardManager siteId={siteId} boards={boards} />
    </div>
  )
}
