'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function EditForm({
  postId,
  boardSlug,
  title: initialTitle,
  content: initialContent,
  category: initialCategory,
  isNotice: initialNotice,
  isAdmin,
  boardCategories,
}: {
  postId: string
  boardSlug: string
  title: string
  content: string
  category: string
  isNotice: boolean
  isAdmin: boolean
  boardCategories: string[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const title = (formData.get('title') as string)?.trim()
    const content = (formData.get('content') as string)?.trim()
    const category = (formData.get('category') as string)?.trim() || null
    const isNotice = formData.get('is_notice') === 'on'

    if (!title) { setError('제목을 입력하세요.'); setLoading(false); return }

    const supabase = createClient()
    const { error: err } = await supabase
      .from('board_posts')
      .update({
        title,
        content: content || null,
        category,
        is_notice: isAdmin ? isNotice : false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (err) {
      setError('수정 중 오류가 발생했습니다.')
      setLoading(false)
    } else {
      router.push(`/board/${boardSlug}/${postId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input name="is_notice" type="checkbox" defaultChecked={initialNotice} className="h-4 w-4 rounded border-zinc-300" />
          공지사항으로 등록
        </label>
      )}

      {boardCategories.length > 0 && (
        <div>
          <select
            name="category"
            defaultValue={initialCategory}
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
          defaultValue={initialTitle}
          placeholder="제목"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>

      <div>
        <textarea
          name="content"
          rows={15}
          defaultValue={initialContent}
          placeholder="내용을 입력하세요"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? '수정 중...' : '수정 완료'}
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
