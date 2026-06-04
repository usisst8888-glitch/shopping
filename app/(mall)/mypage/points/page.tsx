import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '포인트' }

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  order_use: { label: '주문 사용', color: 'text-rose-600' },
  order_earn: { label: '구매 적립', color: 'text-emerald-600' },
  order_cancel_restore: { label: '취소 복원', color: 'text-blue-600' },
  admin_grant: { label: '관리자 지급', color: 'text-emerald-600' },
  admin_revoke: { label: '관리자 회수', color: 'text-rose-600' },
}

export default async function PointsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: history } = await supabase
    .from('point_history')
    .select('id, delta, balance_after, reason, source, order_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <section>
      <h2 className="mb-5 text-xl font-bold text-zinc-900">포인트 내역</h2>
      <div className="rounded-xl bg-white shadow-sm">
        {!history || history.length === 0 ? (
          <p className="py-20 text-center text-sm text-zinc-400">변동 이력이 없습니다.</p>
        ) : (
          <>
            {/* 데스크탑 테이블 */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60 text-xs text-zinc-500">
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">일시</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">내용</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">유형</th>
                    <th className="px-4 py-3 text-right font-medium uppercase tracking-wider">변동</th>
                    <th className="px-4 py-3 text-right font-medium uppercase tracking-wider">잔액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {history.map((h) => {
                    const s = SOURCE_LABEL[h.source] ?? { label: h.source, color: 'text-zinc-600' }
                    return (
                      <tr key={h.id}>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(h.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700">
                          {h.order_id ? (
                            <Link href={`/orders/${h.order_id}`} className="hover:text-zinc-900 hover:underline">
                              {h.reason}
                            </Link>
                          ) : (
                            h.reason
                          )}
                        </td>
                        <td className={`px-4 py-3 text-xs ${s.color}`}>{s.label}</td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${h.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.delta > 0 ? '+' : ''}{h.delta.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-zinc-600">
                          {h.balance_after.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <ul className="divide-y divide-zinc-100 md:hidden">
              {history.map((h) => {
                const s = SOURCE_LABEL[h.source] ?? { label: h.source, color: 'text-zinc-600' }
                return (
                  <li key={h.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] ${s.color}`}>{s.label}</p>
                        <p className="mt-0.5 truncate text-sm text-zinc-900">
                          {h.order_id ? (
                            <Link href={`/orders/${h.order_id}`} className="hover:underline">
                              {h.reason}
                            </Link>
                          ) : (
                            h.reason
                          )}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {new Date(h.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono text-sm font-semibold ${h.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.delta > 0 ? '+' : ''}{h.delta.toLocaleString()}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                          잔액 {h.balance_after.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
