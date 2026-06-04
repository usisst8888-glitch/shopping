'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInquiry } from '../actions'
import { INQUIRY_CATEGORY_LABEL, type InquiryCategory } from '@/lib/types/inquiry'

export function NewInquiryForm({ orders }: { orders: { id: string; order_no: string; created_at: string }[] }) {
  const router = useRouter()
  const [category, setCategory] = useState<InquiryCategory>('general')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [relatedOrderId, setRelatedOrderId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!subject.trim()) return setError('제목을 입력해주세요.')
    if (!body.trim()) return setError('문의 내용을 입력해주세요.')
    setSubmitting(true)
    const r = await createInquiry({
      category,
      subject,
      body,
      relatedOrderId: relatedOrderId || undefined,
    })
    setSubmitting(false)
    if (r.error) {
      setError(r.error)
      return
    }
    if (r.inquiryId) {
      router.push(`/mypage/inquiry/${r.inquiryId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm md:p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">문의 유형</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InquiryCategory)}
              className="w-full cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {Object.entries(INQUIRY_CATEGORY_LABEL).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">관련 주문 (선택)</label>
            <select
              value={relatedOrderId}
              onChange={(e) => setRelatedOrderId(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">(관련 주문 없음)</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_no} · {new Date(o.created_at).toLocaleDateString('ko-KR')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">제목</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="문의 제목을 입력해주세요"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="문의 내용을 자세히 작성해주세요."
            rows={10}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '문의 등록'}
        </button>
      </div>
    </form>
  )
}
