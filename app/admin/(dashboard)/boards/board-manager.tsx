'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBoard, updateBoard, deleteBoard } from './actions'
import type { Board } from './actions'

export function BoardManager({
  siteId,
  boards,
}: {
  siteId: string
  boards: Board[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [catList, setCatList] = useState<string[]>([])
  const [newCat, setNewCat] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('board_categories', JSON.stringify(catList))

    const result = editingBoard
      ? await updateBoard(editingBoard.id, formData)
      : await createBoard(siteId, formData)

    if (result.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setEditingBoard(null)
      router.refresh()
    }
    setLoading(false)
  }

  function handleEdit(board: Board) {
    setEditingBoard(board)
    setCatList(board.board_categories ?? [])
    setShowForm(true)
    setError(null)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingBoard(null)
    setCatList([])
    setNewCat('')
    setError(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* 게시판 목록 */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="font-semibold text-zinc-900">게시판 목록</h3>
          <button
            onClick={() => { setShowForm(true); setEditingBoard(null); setError(null) }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            게시판 추가
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">등록된 게시판이 없습니다.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {boards.map((board) => (
              <div key={board.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900">{board.name}</p>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">/board/{board.slug}</span>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                      {board.board_type === 'gallery' ? '갤러리형' : board.board_type === 'webzine' ? '웹진형' : '리스트형'}
                    </span>
                    {!board.is_active && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400">비활성</span>
                    )}
                  </div>
                  {board.description && (
                    <p className="mt-0.5 text-xs text-zinc-500">{board.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(board)}
                    className="rounded-md bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100"
                  >
                    수정
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`"${board.name}" 게시판을 삭제하시겠습니까? 게시글도 모두 삭제됩니다.`)) {
                        await deleteBoard(board.id)
                        router.refresh()
                      }
                    }}
                    className="rounded-md bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 게시판 추가/수정 폼 */}
      {showForm && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            {editingBoard ? '게시판 수정' : '게시판 추가'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">게시판명</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingBoard?.name ?? ''}
                  placeholder="공지사항"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">슬러그 (URL)</label>
                <input
                  name="slug"
                  type="text"
                  required
                  defaultValue={editingBoard?.slug ?? ''}
                  placeholder="notice"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <p className="mt-1 text-xs text-zinc-400">영문, 숫자, 하이픈만 사용. 예: notice, faq, qna</p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">게시판 유형</label>
              <div className="flex gap-3">
                {[
                  { value: 'list', label: '리스트형', desc: '제목 목록' },
                  { value: 'gallery', label: '갤러리형', desc: '이미지 카드' },
                  { value: 'webzine', label: '웹진형', desc: '이미지+본문' },
                ].map((type) => (
                  <label
                    key={type.value}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
                  >
                    <input
                      type="radio"
                      name="board_type"
                      value={type.value}
                      defaultChecked={(editingBoard?.board_type ?? 'list') === type.value}
                      className="h-4 w-4 border-zinc-300 text-zinc-900"
                    />
                    <div>
                      <p className="font-medium text-zinc-900">{type.label}</p>
                      <p className="text-[11px] text-zinc-400">{type.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">설명 (선택)</label>
              <input
                name="description"
                type="text"
                defaultValue={editingBoard?.description ?? ''}
                placeholder="게시판 설명"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            {/* 게시판 카테고리 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">게시판 카테고리 (선택)</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {catList.map((cat, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
                    {cat}
                    <button type="button" onClick={() => setCatList(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = newCat.trim()
                      if (v && !catList.includes(v)) { setCatList(prev => [...prev, v]); setNewCat('') }
                    }
                  }}
                  placeholder="카테고리명 입력 후 Enter"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newCat.trim()
                    if (v && !catList.includes(v)) { setCatList(prev => [...prev, v]); setNewCat('') }
                  }}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
                >
                  추가
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-400">글 작성 시 카테고리를 선택할 수 있습니다.</p>
            </div>
            {editingBoard && (
              <div className="flex items-center gap-2">
                <input name="is_active" type="hidden" value={editingBoard.is_active ? 'true' : 'false'} />
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    defaultChecked={editingBoard.is_active}
                    onChange={(e) => {
                      const hidden = e.target.parentElement?.parentElement?.querySelector('input[name=is_active]') as HTMLInputElement
                      if (hidden) hidden.value = e.target.checked ? 'true' : 'false'
                    }}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  활성화
                </label>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? '저장 중...' : editingBoard ? '수정 완료' : '게시판 추가'}
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
    </div>
  )
}
