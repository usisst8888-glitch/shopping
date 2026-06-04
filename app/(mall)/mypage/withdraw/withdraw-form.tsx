'use client'

import { useState } from 'react'
import { withdrawAccount } from '../actions'

const CONFIRM_TEXT = '탈퇴합니다'

export function WithdrawForm() {
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (confirm !== CONFIRM_TEXT) {
      setError(`확인 문구 「${CONFIRM_TEXT}」 를 정확히 입력해주세요.`)
      return
    }
    if (!window.confirm('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    setSubmitting(true)
    setError(null)
    // withdrawAccount 는 성공 시 redirect 됨
    try {
      const r = await withdrawAccount(confirm)
      if (r && 'error' in r && r.error) {
        setError(r.error)
        setSubmitting(false)
      }
    } catch {
      // redirect 가 throw 하는 경우(정상) — 따로 처리 안 함
    }
  }

  return (
    <div className="mt-6 border-t border-zinc-100 pt-5">
      <label className="block text-xs font-medium text-zinc-600">
        탈퇴를 진행하려면 아래에 <span className="font-mono font-bold text-rose-600">「{CONFIRM_TEXT}」</span> 를 입력해주세요.
      </label>
      <input
        type="text"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={CONFIRM_TEXT}
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {error && (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || confirm !== CONFIRM_TEXT}
        className="mt-4 w-full cursor-pointer rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? '처리 중...' : '회원탈퇴'}
      </button>
    </div>
  )
}
