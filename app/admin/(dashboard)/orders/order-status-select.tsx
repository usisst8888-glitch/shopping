'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus, type OrderStatus } from './actions'

const OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending_payment', label: '입금대기', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'paid', label: '입금확인', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { value: 'preparing', label: '배송준비', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  { value: 'shipping', label: '배송중', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { value: 'delivered', label: '배송완료', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { value: 'cancelled', label: '취소', color: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
]

export function OrderStatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const opt = OPTIONS.find((o) => o.value === status) ?? OPTIONS[0]

  async function onChange(next: OrderStatus) {
    if (next === status) return
    if (next === 'cancelled' && !confirm('이 주문을 취소하시겠습니까?\n사용한 포인트는 복원되고 적립은 진행되지 않습니다.')) return
    setUpdating(true)
    const r = await updateOrderStatus(id, next)
    setUpdating(false)
    if (r.error) {
      alert(r.error)
    } else {
      router.refresh()
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      disabled={updating || status === 'cancelled'}
      className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ${opt.color} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
