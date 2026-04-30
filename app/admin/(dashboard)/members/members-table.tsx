'use client'

import { useRouter } from 'next/navigation'
import { updateMemberRole, deleteMember } from './actions'
import type { Member } from './actions'

export function MembersTable({ members }: { members: Member[] }) {
  const router = useRouter()

  return (
    <div className="rounded-xl bg-white shadow-sm">
      {members.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-400">등록된 회원이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">이메일</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">역할</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">가입일</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-900">{member.email}</p>
                    <p className="text-[10px] text-zinc-400">{member.id}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={async () => {
                        const newRole = member.role === 'admin' ? 'user' : 'admin'
                        if (confirm(`${member.email}의 역할을 ${newRole === 'admin' ? '관리자' : '일반회원'}로 변경하시겠습니까?`)) {
                          await updateMemberRole(member.id, newRole)
                          router.refresh()
                        }
                      }}
                      className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-[11px] font-semibold transition hover:opacity-80 ${
                        member.role === 'admin'
                          ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                          : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'
                      }`}
                      title="클릭하여 역할 변경"
                    >
                      {member.role === 'admin' ? '관리자' : '일반회원'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(member.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={async () => {
                        if (member.role === 'admin') {
                          alert('관리자는 삭제할 수 없습니다. 먼저 일반회원으로 변경하세요.')
                          return
                        }
                        if (confirm(`${member.email} 회원을 삭제하시겠습니까?`)) {
                          await deleteMember(member.id)
                          router.refresh()
                        }
                      }}
                      className="rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500 transition hover:bg-red-100"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
