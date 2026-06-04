import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMemberById, getMemberLoginInfo, getMemberPointHistory } from '../actions'
import { getGroups } from '../groups/actions'
import { MemberDetailLayout } from './member-detail-layout'

export const metadata = { title: '회원 상세' }

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = await getMemberById(id)
  if (!member) notFound()
  const [history, loginInfo, groups] = await Promise.all([
    getMemberPointHistory(id, 50),
    getMemberLoginInfo(id),
    getGroups(),
  ])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/admin/members" className="hover:text-zinc-900">회원목록</Link>
        <span>›</span>
        <span className="text-zinc-900">{member.name || member.email}</span>
      </div>

      <MemberDetailLayout member={member} history={history} loginInfo={loginInfo} groups={groups} />
    </div>
  )
}
