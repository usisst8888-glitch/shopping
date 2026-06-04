'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Site, createSite, updateSite, deleteSite } from './actions'

type Mode = 'idle' | 'create' | 'edit'

export function SiteManager({ sites }: { sites: Site[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('idle')
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleEdit(site: Site) {
    setEditingSite(site)
    setMode('edit')
    setError(null)
  }

  function handleCancel() {
    setMode('idle')
    setEditingSite(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const result = mode === 'edit' && editingSite
      ? await updateSite(editingSite.id, formData)
      : await createSite(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setMode('idle')
      setEditingSite(null)
      setLoading(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 사이트를 삭제하시겠습니까?')) return

    const result = await deleteSite(id)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* 사이트 목록 */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">등록된 사이트</h3>
          {mode === 'idle' && (
            <button
              onClick={() => { setMode('create'); setError(null) }}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              사이트 추가
            </button>
          )}
        </div>

        {sites.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-400">등록된 사이트가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {sites.map((site) => (
              <div key={site.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-zinc-900">{site.name}</p>
                  <p className="text-sm text-zinc-500">{site.domain}</p>
                  {site.description && (
                    <p className="mt-0.5 text-xs text-zinc-400">{site.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(site)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(site.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 사이트 추가/수정 폼 */}
      {mode !== 'idle' && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            {mode === 'create' ? '새 사이트 추가' : '사이트 수정'}
          </h3>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="mb-1 block text-sm font-medium text-zinc-700">
                도메인
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                required
                defaultValue={editingSite?.domain ?? ''}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="example.com"
              />
              <p className="mt-1 text-xs text-zinc-400">포트 포함 (예: localhost:3000, shop.example.com)</p>
            </div>
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
                사이트명
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={editingSite?.name ?? ''}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="LUCKYPLE"
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700">
                사이트 설명 (SEO)
              </label>
              <input
                id="description"
                name="description"
                type="text"
                defaultValue={editingSite?.description ?? ''}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="명품 레플리카 전문 사이트"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? '저장 중...' : mode === 'create' ? '사이트 추가' : '수정 완료'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 안내 */}
      <div className="rounded-xl bg-blue-50 p-6">
        <h4 className="mb-2 text-sm font-semibold text-blue-900">도메인 추가 방법</h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
          <li>위에서 새 사이트를 추가합니다 (도메인, 사이트명, 설명)</li>
          <li>Vercel 대시보드 → Settings → Domains에서 동일한 도메인을 추가합니다</li>
          <li>DNS 레코드를 설정합니다 (CNAME → cname.vercel-dns.com)</li>
        </ol>
      </div>
    </div>
  )
}
