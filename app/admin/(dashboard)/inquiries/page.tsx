import Link from 'next/link'
import { getAdminInquiries } from './actions'
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, type InquiryStatus } from '@/lib/types/inquiry'

export const metadata = { title: '문의 관리' }

const STATUS_OPTIONS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '답변 대기' },
  { value: 'answered', label: '답변 완료' },
  { value: 'closed', label: '종료' },
]

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; search?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const size = Math.max(1, parseInt(params.size ?? '20') || 20)
  const search = params.search ?? ''
  const status = (params.status ?? 'all') as InquiryStatus | 'all'

  const { list, total } = await getAdminInquiries({ page, size, search, status })
  const totalPages = Math.max(1, Math.ceil(total / size))

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams()
    const merged = {
      page: String(page),
      size: String(size),
      search,
      status,
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    }
    for (const [k, v] of Object.entries(merged)) {
      if (k === 'page') {
        if (v !== '1') p.set(k, v)
      } else if (v && v !== 'all') {
        p.set(k, v)
      }
    }
    const qs = p.toString()
    return `/admin/inquiries${qs ? `?${qs}` : ''}`
  }

  const maxBtns = 5
  let startPage = Math.max(1, page - Math.floor(maxBtns / 2))
  const endPage = Math.min(totalPages, startPage + maxBtns - 1)
  if (endPage - startPage + 1 < maxBtns) startPage = Math.max(1, endPage - maxBtns + 1)
  const pageNums = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">문의 관리</h1>
        <div className="text-sm text-zinc-500">총 <span className="font-semibold text-zinc-900">{total.toLocaleString()}</span>건</div>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <form method="GET" action="/admin/inquiries" className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input type="hidden" name="size" value={size} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">제목 검색</label>
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="문의 제목"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">상태</label>
            <select name="status" defaultValue={status} className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">검색</button>
            {(search || status !== 'all') && (
              <Link href="/admin/inquiries" className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">초기화</Link>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {list.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">조건에 맞는 문의가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">작성자</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">메시지</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">최근 활동</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((q) => {
                  const st = INQUIRY_STATUS_LABEL[q.status]
                  return (
                    <tr key={q.id} className="transition-colors hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600">{INQUIRY_CATEGORY_LABEL[q.category]}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/inquiries/${q.id}`} className="text-sm font-medium text-zinc-900 hover:underline">
                          {q.subject}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-zinc-900">{q.user_name || '-'}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{q.user_email}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-500">{q.message_count}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(q.last_activity_at).toLocaleDateString('ko-KR')}<br />
                        <span className="text-zinc-400">{new Date(q.last_activity_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link href={`/admin/inquiries/${q.id}`} className="cursor-pointer rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition hover:bg-blue-100">상세</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <Link href={buildUrl({ page: 1 })} className={`rounded-lg px-3 py-2 text-sm ${page === 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&laquo;</Link>
          <Link href={buildUrl({ page: Math.max(1, page - 1) })} className={`rounded-lg px-3 py-2 text-sm ${page === 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&lsaquo;</Link>
          {pageNums.map((p) => (
            <Link key={p} href={buildUrl({ page: p })} className={`rounded-lg px-3 py-2 text-sm font-medium ${p === page ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{p}</Link>
          ))}
          <Link href={buildUrl({ page: Math.min(totalPages, page + 1) })} className={`rounded-lg px-3 py-2 text-sm ${page === totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&rsaquo;</Link>
          <Link href={buildUrl({ page: totalPages })} className={`rounded-lg px-3 py-2 text-sm ${page === totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&raquo;</Link>
        </div>
      )}
    </div>
  )
}
