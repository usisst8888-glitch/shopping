'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function PostActions({
  postId,
  boardSlug,
}: {
  postId: string
  boardSlug: string
}) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('board_posts').delete().eq('id', postId)
    router.push(`/board/${boardSlug}`)
  }

  return (
    <div className="flex gap-2">
      <Link
        href={`/board/${boardSlug}/${postId}/edit`}
        className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-100"
      >
        수정
      </Link>
      <button
        onClick={handleDelete}
        className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-100"
      >
        삭제
      </button>
    </div>
  )
}
