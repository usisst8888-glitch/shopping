import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInquiryWithMessages } from '../actions'
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL } from '@/lib/types/inquiry'
import { InquiryConversation } from './inquiry-conversation'

export const metadata = { title: '문의 상세' }

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getInquiryWithMessages(id)
  if (!data) notFound()
  const { inquiry, messages } = data
  const st = INQUIRY_STATUS_LABEL[inquiry.status]

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/mypage/inquiry" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← 목록으로
        </Link>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${st.color}`}>
          {st.label}
        </span>
      </div>

      <div className="mb-5 rounded-xl bg-white p-5 shadow-sm md:p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
            {INQUIRY_CATEGORY_LABEL[inquiry.category]}
          </span>
          {inquiry.related_order_id && (
            <Link
              href={`/orders/${inquiry.related_order_id}`}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
            >
              관련 주문 보기
            </Link>
          )}
        </div>
        <h1 className="text-lg font-bold text-zinc-900 md:text-xl">{inquiry.subject}</h1>
        <p className="mt-1 text-xs text-zinc-400">
          {new Date(inquiry.created_at).toLocaleString('ko-KR')}
        </p>
      </div>

      <InquiryConversation
        inquiryId={inquiry.id}
        status={inquiry.status}
        initialMessages={messages}
        isAdminView={false}
      />
    </section>
  )
}
