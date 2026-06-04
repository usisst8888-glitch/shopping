'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { postUserReply, closeInquiry, deleteInquiry } from '../actions'
import { postAdminReply, setInquiryStatus } from '@/app/admin/(dashboard)/inquiries/actions'
import type { InquiryMessage, InquiryStatus } from '@/lib/types/inquiry'

export function InquiryConversation({
  inquiryId,
  status,
  initialMessages,
  isAdminView,
}: {
  inquiryId: string
  status: InquiryStatus
  initialMessages: InquiryMessage[]
  isAdminView: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const closed = status === 'closed'

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    const action = isAdminView ? postAdminReply : postUserReply
    const r = await action(inquiryId, body)
    setSending(false)
    if (r.error) {
      alert(r.error)
      return
    }
    setBody('')
    router.refresh()
  }

  async function handleClose() {
    if (!confirm('이 문의를 종료하시겠습니까? 이후 추가 답변이 불가합니다.')) return
    const r = await closeInquiry(inquiryId)
    if (r?.error) {
      alert(r.error)
      return
    }
    router.refresh()
  }

  async function handleAdminStatus(next: InquiryStatus) {
    const r = await setInquiryStatus(inquiryId, next)
    if (r.error) {
      alert(r.error)
      return
    }
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('이 문의를 삭제하시겠습니까? 모든 대화 내용도 함께 삭제됩니다.')) return
    await deleteInquiry(inquiryId)
  }

  return (
    <div className="space-y-5">
      {/* 메시지 목록 */}
      <div className="space-y-3">
        {initialMessages.map((m) => {
          const isAdminMsg = m.author_role === 'admin'
          return (
            <div key={m.id} className={`flex ${isAdminMsg ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                isAdminMsg
                  ? 'rounded-tl-sm bg-white text-zinc-900'
                  : 'rounded-tr-sm bg-zinc-900 text-white'
              }`}>
                <div className={`mb-1 flex items-center gap-2 text-[10px] ${isAdminMsg ? 'text-zinc-500' : 'text-zinc-300'}`}>
                  <span className={`rounded-full px-1.5 py-0.5 ${
                    isAdminMsg
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-white/15 text-white'
                  }`}>
                    {isAdminMsg ? '관리자' : '나'}
                  </span>
                  <span>
                    {new Date(m.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 입력 영역 (종료 시 비활성) */}
      {!closed ? (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isAdminView ? '답변을 작성해주세요.' : '추가 문의 내용을 작성해주세요.'}
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed focus:border-zinc-900 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isAdminView && (
                <>
                  {status !== 'answered' && (
                    <button
                      type="button"
                      onClick={() => handleAdminStatus('answered')}
                      className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      답변완료로 표시
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAdminStatus('closed')}
                    className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    종료
                  </button>
                </>
              )}
              {!isAdminView && (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    문의 종료
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="cursor-pointer rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? '전송 중...' : isAdminView ? '답변 등록' : '메시지 전송'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">
          종료된 문의입니다.
        </div>
      )}
    </div>
  )
}
