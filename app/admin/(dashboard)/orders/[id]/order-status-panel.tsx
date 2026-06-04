'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus, type OrderStatus } from '../actions'

const STEPS: { value: OrderStatus; label: string }[] = [
  { value: 'pending_payment', label: '입금대기' },
  { value: 'paid', label: '입금확인' },
  { value: 'preparing', label: '배송준비' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
]

const STATUS_RING: Record<OrderStatus, string> = {
  pending_payment: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-blue-50 text-blue-700 ring-blue-200',
  preparing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  shipping: 'bg-violet-50 text-violet-700 ring-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: '입금대기',
  paid: '입금확인',
  preparing: '배송준비',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
}

export function OrderStatusPanel({
  id,
  status,
  pointsUsed,
  pointsEarned,
}: {
  id: string
  status: OrderStatus
  pointsUsed: number
  pointsEarned: number
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState<OrderStatus | null>(null)

  const cancelled = status === 'cancelled'
  const currentIdx = STEPS.findIndex((s) => s.value === status)

  async function changeTo(next: OrderStatus, message?: string) {
    if (next === status) return
    if (message && !confirm(message)) return
    setUpdating(next)
    const r = await updateOrderStatus(id, next)
    setUpdating(null)
    if (r.error) {
      alert(r.error)
    } else {
      router.refresh()
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-zinc-900">주문 상태</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_RING[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* 단계 표시 */}
      {!cancelled && (
        <div className="mb-5">
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <div key={s.value} className="flex flex-1 flex-col items-center">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= currentIdx ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                }`}>
                  {i + 1}
                </div>
                <span className={`mt-1 text-[10px] ${i <= currentIdx ? 'font-medium text-zinc-900' : 'text-zinc-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 진행 버튼 */}
      {!cancelled && (
        <div className="space-y-2">
          {STEPS.map((s, i) => {
            const isCurrent = i === currentIdx
            const isNext = i === currentIdx + 1
            const isPast = i < currentIdx
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  if (s.value === 'delivered' && pointsEarned > 0) {
                    changeTo(s.value, `배송완료로 전환 시 회원에게 ${pointsEarned.toLocaleString()}P 가 적립됩니다. 진행할까요?`)
                  } else {
                    changeTo(s.value)
                  }
                }}
                disabled={isCurrent || isPast || updating !== null}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  isCurrent
                    ? 'bg-zinc-900 text-white'
                    : isPast
                    ? 'bg-zinc-50 text-zinc-400'
                    : isNext
                    ? 'border border-zinc-900 bg-white text-zinc-900 hover:bg-zinc-50'
                    : 'border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                } disabled:cursor-not-allowed`}
              >
                <span>{s.label}</span>
                {isCurrent && <span className="text-[10px]">현재 상태</span>}
                {isNext && <span className="text-[10px] font-medium">→ 다음</span>}
                {updating === s.value && <span className="text-[10px]">변경 중...</span>}
              </button>
            )
          })}

          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => changeTo('cancelled', `주문을 취소하시겠습니까?\n\n${pointsUsed > 0 ? `사용한 ${pointsUsed.toLocaleString()}P 가 복원됩니다.\n` : ''}적립은 진행되지 않습니다.`)}
              disabled={updating !== null}
              className="w-full cursor-pointer rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              주문 취소
            </button>
          </div>
        </div>
      )}

      {cancelled && (
        <div className="rounded-lg bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">
          취소된 주문입니다.
          {pointsUsed > 0 && (
            <p className="mt-1 text-xs text-zinc-400">
              사용한 {pointsUsed.toLocaleString()}P 가 복원되었습니다.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
