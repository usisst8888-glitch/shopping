'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TiptapEditor } from '@/components/admin/tiptap-editor'

export function WriteForm({
  boardId,
  boardSlug,
  userId,
  userName,
  isAdmin,
  boardCategories,
}: {
  boardId: string
  boardSlug: string
  userId: string
  userName: string
  isAdmin: boolean
  boardCategories: string[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const title = (formData.get('title') as string)?.trim()
    const category = (formData.get('category') as string)?.trim() || null
    const isNotice = formData.get('is_notice') === 'on'

    if (!title) { setError('제목을 입력하세요.'); setLoading(false); return }

    const supabase = createClient()
    const { error: err } = await supabase.from('board_posts').insert({
      board_id: boardId,
      user_id: userId,
      title,
      content: content || null,
      author_name: userName,
      is_notice: isAdmin ? isNotice : false,
      category,
    })

    if (err) {
      setError('글 작성 중 오류가 발생했습니다.')
      setLoading(false)
    } else {
      router.push(`/board/${boardSlug}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input name="is_notice" type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
          공지사항으로 등록
        </label>
      )}

      {boardCategories.length > 0 && (
        <div>
          <select
            name="category"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="">카테고리 선택</option>
            {boardCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <input
          name="title"
          type="text"
          required
          placeholder="제목"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>

      <div>
        <TiptapEditor content={content} onChange={setContent} minHeight="400px" />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? '등록 중...' : '등록'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          취소
        </button>
      </div>
    </form>
  )
}
