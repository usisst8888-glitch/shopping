'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addBlockedIp, removeBlockedIp, type BlockedIp } from './actions'

export function BlockedIpsManager({ initial }: { initial: BlockedIp[] }) {
  const router = useRouter()
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    setError(null)
    setAdding(true)
    const r = await addBlockedIp(ip, reason)
    setAdding(false)
    if (r.error) {
      setError(r.error)
      return
    }
    setIp('')
    setReason('')
    router.refresh()
  }

  async function handleRemove(b: BlockedIp) {
    if (!confirm(`「${b.ip}」 차단을 해제하시겠습니까?`)) return
    const r = await removeBlockedIp(b.id)
    if (r.error) {
      alert(r.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-zinc-900">IP 차단</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          여기에 등록된 IP는 사이트에 접속할 수 없습니다. (관리자 페이지 포함)
        </p>
      </div>

      <div className="p-6">
        {/* 추가 폼 */}
        <div className="mb-5 grid gap-2 md:grid-cols-[180px_1fr_auto]">
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="IP (예: 1.2.3.4)"
            className="h-10 rounded-md border border-zinc-300 px-3 font-mono text-sm focus:border-zinc-900 focus:outline-none"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="차단 사유 (선택)"
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !ip.trim()}
            className="h-10 rounded-md bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {adding ? '차단 중...' : '+ 차단'}
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {/* 목록 */}
        {initial.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center">
            <p className="text-sm text-zinc-400">차단된 IP가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
                  <th className="px-4 py-2 text-left font-medium">IP</th>
                  <th className="px-4 py-2 text-left font-medium">사유</th>
                  <th className="px-4 py-2 text-left font-medium">등록일</th>
                  <th className="w-24 px-4 py-2 text-center font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {initial.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50/70">
                    <td className="px-4 py-2.5 font-mono text-sm text-zinc-900">{b.ip}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-600">
                      {b.reason || <span className="text-zinc-300">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">
                      {new Date(b.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(b)}
                        className="rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200"
                      >
                        해제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
