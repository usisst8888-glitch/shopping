import Link from 'next/link'
import { getMyInquiries } from './actions'
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL } from '@/lib/types/inquiry'

export const metadata = { title: '1:1 문의' }

export default async function InquiryListPage() {
  const inquiries = await getMyInquiries()

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">1:1 문의</h2>
        <Link
          href="/mypage/inquiry/new"
          className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + 문의 작성
        </Link>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-xl bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-zinc-400">진행 중인 문의가 없습니다.</p>
          <Link href="/mypage/inquiry/new" className="mt-3 inline-block text-sm font-medium text-zinc-900 hover:underline">
            새 문의 작성하기 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {inquiries.map((q) => {
            const st = INQUIRY_STATUS_LABEL[q.status]
            return (
              <li key={q.id}>
                <Link
                  href={`/mypage/inquiry/${q.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow md:p-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                        {INQUIRY_CATEGORY_LABEL[q.category]}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(q.last_activity_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-zinc-900">{q.subject}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
