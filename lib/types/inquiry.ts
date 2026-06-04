export type InquiryCategory = 'general' | 'order' | 'product' | 'exchange' | 'refund' | 'etc'
export type InquiryStatus = 'open' | 'answered' | 'closed'

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  general: '일반 문의',
  order: '주문/결제',
  product: '상품 문의',
  exchange: '교환',
  refund: '환불',
  etc: '기타',
}

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, { label: string; color: string }> = {
  open: { label: '답변 대기', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  answered: { label: '답변 완료', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  closed: { label: '종료', color: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
}

export type Inquiry = {
  id: string
  site_id: string | null
  user_id: string
  category: InquiryCategory
  subject: string
  status: InquiryStatus
  related_order_id: string | null
  is_private: boolean
  last_activity_at: string
  created_at: string
  updated_at: string
}

export type InquiryMessage = {
  id: string
  inquiry_id: string
  author_id: string | null
  author_role: 'user' | 'admin'
  body: string
  created_at: string
}
