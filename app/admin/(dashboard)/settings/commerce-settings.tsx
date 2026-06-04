'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Site, updateSiteCommerce } from './actions'

export function CommerceSettings({ site }: { site: Site }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [bankName, setBankName] = useState(site.bank_name ?? '')
  const [bankAccountNumber, setBankAccountNumber] = useState(site.bank_account_number ?? '')
  const [bankAccountHolder, setBankAccountHolder] = useState(site.bank_account_holder ?? '')
  const [shippingFee, setShippingFee] = useState(String(site.shipping_fee ?? 5000))
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(String(site.free_shipping_threshold ?? 0))
  const [pointEarnRate, setPointEarnRate] = useState(String(site.point_earn_rate ?? 2))
  const [pointMinBalance, setPointMinBalance] = useState(String(site.point_min_balance ?? 5000))
  const [pointMinOrderAmount, setPointMinOrderAmount] = useState(String(site.point_min_order_amount ?? 10000))

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateSiteCommerce(site.id, {
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_holder: bankAccountHolder,
      shipping_fee: parseInt(shippingFee) || 0,
      free_shipping_threshold: parseInt(freeShippingThreshold) || 0,
      point_earn_rate: parseInt(pointEarnRate) || 0,
      point_min_balance: parseInt(pointMinBalance) || 0,
      point_min_order_amount: parseInt(pointMinOrderAmount) || 0,
    })
    setSaving(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '저장되었습니다.' })
      setTimeout(() => setMessage(null), 2500)
      router.refresh()
    }
  }

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-zinc-900">결제 · 배송 · 포인트 설정</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{site.name} · {site.domain}</p>
      </div>

      <div className="space-y-6 p-6">
        {/* 무통장입금 계좌 */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-800">무통장입금 계좌</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">은행명</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="예: 국민은행"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">계좌번호</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="예: 123-456-789012"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">예금주</label>
              <input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="예: 럭키플"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* 배송비 */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-800">배송비</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">기본 배송비 (원)</label>
              <input
                type="number"
                inputMode="numeric"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                onBlur={() => setShippingFee(String(Math.max(0, parseInt(shippingFee) || 0)))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">무료배송 기준 (원)</label>
              <input
                type="number"
                inputMode="numeric"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                onBlur={() => setFreeShippingThreshold(String(Math.max(0, parseInt(freeShippingThreshold) || 0)))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-zinc-400">0이면 무료배송 비활성</p>
            </div>
          </div>
        </section>

        {/* 포인트 */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-800">포인트</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">적립률 (%)</label>
              <input
                type="number"
                inputMode="numeric"
                value={pointEarnRate}
                onChange={(e) => setPointEarnRate(e.target.value)}
                onBlur={() => setPointEarnRate(String(Math.max(0, parseInt(pointEarnRate) || 0)))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-zinc-400">구매 금액 기준</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">사용 가능 최소 보유 (원)</label>
              <input
                type="number"
                inputMode="numeric"
                value={pointMinBalance}
                onChange={(e) => setPointMinBalance(e.target.value)}
                onBlur={() => setPointMinBalance(String(Math.max(0, parseInt(pointMinBalance) || 0)))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">사용 가능 최소 주문금액 (원)</label>
              <input
                type="number"
                inputMode="numeric"
                value={pointMinOrderAmount}
                onChange={(e) => setPointMinOrderAmount(e.target.value)}
                onBlur={() => setPointMinOrderAmount(String(Math.max(0, parseInt(pointMinOrderAmount) || 0)))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-lg px-4 py-2.5 text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-zinc-100 bg-zinc-50 px-6 py-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
