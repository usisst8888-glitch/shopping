'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TiptapEditor } from '@/components/admin/tiptap-editor'
import { createPost, updatePost, type Post } from './actions'

type BoardOpt = { id: string; name: string; board_categories: string[] }

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900'

// ISO 타임스탬프를 datetime-local 인풋 포맷(YYYY-MM-DDTHH:mm)으로 변환
function toLocalDateTime(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PostForm({ boards, post }: { boards: BoardOpt[]; post?: Post | null }) {
  const router = useRouter()
  const isEdit = !!post

  const [boardId, setBoardId] = useState(post?.board_id ?? boards[0]?.id ?? '')
  const [category, setCategory] = useState(post?.category ?? '')
  const [isNotice, setIsNotice] = useState(post?.is_notice ?? false)
  const [isPublished, setIsPublished] = useState(post?.is_published ?? true)
  const [content, setContent] = useState(post?.content ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBoard = boards.find((b) => b.id === boardId)
  const cats = selectedBoard?.board_categories ?? []

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    formData.set('board_id', boardId)
    formData.set('category', category)
    formData.set('is_notice', String(isNotice))
    formData.set('is_published', String(isPublished))
    formData.set('content', content)
    if (isEdit && post) formData.set('id', post.id)

    const result = isEdit ? await updatePost(formData) : await createPost(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/admin/posts')
      router.refresh()
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">게시판</label>
        <select value={boardId} onChange={(e) => { setBoardId(e.target.value); setCategory('') }} className={inputClass}>
          {boards.length === 0 && <option value="">게시판 없음</option>}
          {boards.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {cats.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="">선택 안 함</option>
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700">제목</label>
        <input id="title" name="title" type="text" required defaultValue={post?.title ?? ''} className={inputClass} placeholder="제목을 입력하세요" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="author_name" className="mb-1 block text-sm font-medium text-zinc-700">작성자</label>
          <input id="author_name" name="author_name" type="text" defaultValue={post?.author_name ?? '관리자'} className={inputClass} />
        </div>
        <div>
          <label htmlFor="like_count" className="mb-1 block text-sm font-medium text-zinc-700">좋아요 수</label>
          <input id="like_count" name="like_count" type="number" min={0} defaultValue={post?.like_count ?? 0} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="created_at" className="mb-1 block text-sm font-medium text-zinc-700">작성일</label>
          <input
            id="created_at"
            name="created_at"
            type="datetime-local"
            defaultValue={toLocalDateTime(post?.created_at)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="view_count" className="mb-1 block text-sm font-medium text-zinc-700">조회수</label>
          <input id="view_count" name="view_count" type="number" min={0} defaultValue={post?.view_count ?? 0} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">공개 상태</label>
        <div className="grid w-60 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsPublished(true)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${isPublished ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
          >
            공개
          </button>
          <button
            type="button"
            onClick={() => setIsPublished(false)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${!isPublished ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
          >
            비공개
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">비공개로 두면 사이트 게시판에 노출되지 않습니다.</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" checked={isNotice} onChange={(e) => setIsNotice(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
        공지사항으로 등록
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">내용</label>
        <TiptapEditor content={content} onChange={setContent} minHeight="400px" />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading || !boardId} className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
          {loading ? '저장 중...' : isEdit ? '수정 완료' : '게시물 등록'}
        </button>
        <button type="button" onClick={() => router.push('/admin/posts')} className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          취소
        </button>
      </div>
    </form>
  )
}
