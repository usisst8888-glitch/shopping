'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LayerPopup } from './actions'
import { createPopup, updatePopup, deletePopup, togglePopupActive } from './actions'

export function PopupManager({
  siteId,
  initialPopups,
}: {
  siteId: string
  initialPopups: LayerPopup[]
}) {
  const router = useRouter()
  const [popups] = useState(initialPopups)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LayerPopup | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = editing
      ? await updatePopup(editing.id, formData)
      : await createPopup(siteId, formData)

    if (result.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setEditing(null)
      setPreview(null)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('이 팝업을 삭제하시겠습니까?')) return
    await deletePopup(id)
    router.refresh()
  }

  async function handleToggle(id: string, isActive: boolean) {
    await togglePopupActive(id, isActive)
    router.refresh()
  }

  function openEdit(popup: LayerPopup) {
    setEditing(popup)
    setPreview(popup.image_url)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(null)
    setPreview(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* 팝업 목록 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">팝업 목록</h2>
          <button
            onClick={openCreate}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + 팝업 추가
          </button>
        </div>

        {popups.length === 0 ? (
          <p className="text-center text-sm text-zinc-400 py-8">등록된 팝업이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {popups.map((popup) => (
              <div key={popup.id} className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4">
                <img src={popup.image_url} alt={popup.title} className="h-20 w-20 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900">{popup.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {popup.width}px · {popup.position === 'center' ? '가운데' : popup.position === 'left' ? '왼쪽' : '오른쪽'}
                    {popup.start_date && ` · ${popup.start_date.slice(0, 10)}`}
                    {popup.end_date && ` ~ ${popup.end_date.slice(0, 10)}`}
                  </p>
                  {popup.link_url && (
                    <p className="mt-0.5 text-xs text-zinc-400 truncate">{popup.link_url}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(popup.id, !popup.is_active)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      popup.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {popup.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    onClick={() => openEdit(popup)}
                    className="text-xs text-zinc-500 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(popup.id)}
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

      {/* 팝업 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editing ? '팝업 수정' : '팝업 추가'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">제목</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editing?.title ?? ''}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="팝업 제목"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">이미지</label>
                {preview && (
                  <img src={preview} alt="미리보기" className="mb-2 h-40 w-auto rounded-lg border border-zinc-200 object-contain" />
                )}
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setPreview(URL.createObjectURL(file))
                  }}
                  className="w-full text-sm text-zinc-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">클릭 시 이동 URL</label>
                <input
                  name="link_url"
                  type="text"
                  defaultValue={editing?.link_url ?? ''}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="https:// 또는 /category/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">위치</label>
                  <select
                    name="position"
                    defaultValue={editing?.position ?? 'center'}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="center">가운데</option>
                    <option value="left">왼쪽</option>
                    <option value="right">오른쪽</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">너비 (px)</label>
                  <input
                    name="width"
                    type="number"
                    defaultValue={editing?.width ?? 400}
                    min={200}
                    max={800}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">시작일 (선택)</label>
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={editing?.start_date?.slice(0, 10) ?? ''}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">종료일 (선택)</label>
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={editing?.end_date?.slice(0, 10) ?? ''}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); setPreview(null) }}
                  className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {loading ? '저장 중...' : editing ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
