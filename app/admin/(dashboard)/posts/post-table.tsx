'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deletePost, togglePublish, type Post } from './actions'

export function PostTable({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleToggle(id: string, next: boolean) {
    const result = await togglePublish(id, next)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('이 게시물을 삭제하시겠습니까?')) return
    setDeletingId(id)
    const result = await deletePost(id)
    if (result.error) {
      alert(result.error)
      setDeletingId(null)
    } else {
      router.refresh()
    }
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-100 bg-white py-16 text-center">
        <p className="text-sm text-zinc-400">게시물이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
            <th className="px-4 py-3 font-medium">위치</th>
            <th className="px-4 py-3 font-medium">제목</th>
            <th className="px-4 py-3 font-medium">작성자</th>
            <th className="px-4 py-3 text-center font-medium">좋아요</th>
            <th className="px-4 py-3 text-center font-medium">조회</th>
            <th className="px-4 py-3 font-medium">작성일</th>
            <th className="px-4 py-3 text-center font-medium">공개</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {posts.map((p) => (
            <tr key={p.id} className="hover:bg-zinc-50/50">
              <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{p.board_name}</td>
              <td className="px-4 py-3">
                <Link href={`/admin/posts/${p.id}/edit`} className="text-zinc-900 hover:underline">
                  {p.is_notice && <span className="mr-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">공지</span>}
                  {p.category && <span className="mr-1 text-zinc-400">[{p.category}]</span>}
                  {p.title}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{p.author_name || '-'}</td>
              <td className="px-4 py-3 text-center text-zinc-500">{p.like_count}</td>
              <td className="px-4 py-3 text-center text-zinc-500">{p.view_count}</td>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                {new Date(p.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => handleToggle(p.id, !p.is_published)}
                  className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    p.is_published
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {p.is_published ? '공개' : '비공개'}
                </button>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link href={`/admin/posts/${p.id}/edit`} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                  수정
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="ml-2 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {deletingId === p.id ? '삭제 중...' : '삭제'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
