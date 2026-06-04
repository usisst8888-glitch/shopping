import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminInquiryDetail } from '../actions'
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL } from '@/lib/types/inquiry'
import { InquiryConversation } from '@/app/(mall)/mypage/inquiry/[id]/inquiry-conversation'

export const metadata = { title: '문의 상세' }

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getAdminInquiryDetail(id)
  if (!data) notFound()

  const st = INQUIRY_STATUS_LABEL[data.status]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/inquiries" className="text-xs text-zinc-500 hover:text-zinc-900">← 문의 목록</Link>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${st.color}`}>
          {st.label}
        </span>
      </div>

      <div className="mb-5 rounded-xl bg-white p-5 shadow-sm md:p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
            {INQUIRY_CATEGORY_LABEL[data.category]}
          </span>
          {data.related_order_id && (
            <Link
              href={`/admin/orders/${data.related_order_id}`}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
            >
              관련 주문 보기 →
            </Link>
          )}
        </div>
        <h1 className="text-xl font-bold text-zinc-900">{data.subject}</h1>
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-3">
          <div>
            <span className="text-zinc-400">작성자</span>{' '}
            <span className="text-zinc-700">{data.user_name || '-'}</span>
            <span className="ml-1 text-zinc-400">({data.user_email})</span>
          </div>
          <div>
            <span className="text-zinc-400">등록일</span>{' '}
            {new Date(data.created_at).toLocaleString('ko-KR')}
          </div>
          <div>
            <span className="text-zinc-400">최근 활동</span>{' '}
            {new Date(data.last_activity_at).toLocaleString('ko-KR')}
          </div>
        </div>
      </div>

      <InquiryConversation
        inquiryId={data.id}
        status={data.status}
        initialMessages={data.messages}
        isAdminView={true}
      />
    </div>
  )
}
