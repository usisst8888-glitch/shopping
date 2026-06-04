'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderMemo } from '../actions'

export function OrderMemoEditor({ id, initialMemo }: { id: string; initialMemo: string }) {
  const router = useRouter()
  const [memo, setMemo] = useState(initialMemo)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const dirty = memo !== initialMemo

  async function handleSave() {
    setSaving(true)
    const r = await updateOrderMemo(id, memo)
    setSaving(false)
    if (r.error) {
      alert(r.error)
      return
    }
    setSavedAt(new Date().toLocaleTimeString('ko-KR'))
    router.refresh()
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-base font-bold text-zinc-900">관리자 메모</h3>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="내부 메모 (예: 입금자명 확인, 배송 지연 사유 등). 회원에게는 보이지 않습니다."
        rows={5}
        className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">
          {savedAt ? `저장됨 · ${savedAt}` : ''}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '메모 저장'}
        </button>
      </div>
    </section>
  )
}
