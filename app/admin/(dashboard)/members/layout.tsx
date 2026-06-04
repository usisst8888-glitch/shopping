import { MembersTabs } from './members-tabs'

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">회원 관리</h1>
      </div>
      <MembersTabs />
      <div className="mt-4">{children}</div>
    </div>
  )
}
