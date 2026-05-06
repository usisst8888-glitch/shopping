import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteConfig } from '@/lib/site'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: board } = await supabase
    .from('boards')
    .select('name')
    .eq('slug', decodeURIComponent(slug))
    .single()

  return { title: board?.name ?? '게시판' }
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1') || 1
  const size = 20

  const supabase = await createClient()

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', decodeURIComponent(slug))
    .eq('is_active', true)
    .single()

  if (!board) notFound()

  // 공지사항
  const { data: notices } = await supabase
    .from('board_posts')
    .select('id, title, author_name, view_count, created_at')
    .eq('board_id', board.id)
    .eq('is_notice', true)
    .order('created_at', { ascending: false })

  // 일반 게시글
  const from = (page - 1) * size
  const { data: posts, count } = await supabase
    .from('board_posts')
    .select('id, title, author_name, view_count, created_at', { count: 'exact' })
    .eq('board_id', board.id)
    .eq('is_notice', false)
    .order('created_at', { ascending: false })
    .range(from, from + size - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / size))

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">{board.name}</h1>
      {board.description && (
        <p className="mb-6 text-sm text-zinc-500">{board.description}</p>
      )}

      {/* 글쓰기 버튼 */}
      <div className="mb-4 flex justify-end">
        <Link
          href={`/board/${slug}/write`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          글쓰기
        </Link>
      </div>

      {/* 게시글 목록 */}
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 text-left font-medium text-zinc-500">제목</th>
              <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 100 }}>작성자</th>
              <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 80 }}>조회</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-500" style={{ width: 100 }}>날짜</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(notices ?? []).map((post) => (
              <tr key={post.id} className="bg-amber-50/50">
                <td className="px-4 py-3">
                  <Link href={`/board/${slug}/${post.id}`} className="hover:underline">
                    <span className="mr-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>
                    {post.title}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.author_name || '-'}</td>
                <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.view_count}</td>
                <td className="px-4 py-3 text-center text-xs text-zinc-400">
                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
            {(posts ?? []).map((post) => (
              <tr key={post.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/board/${slug}/${post.id}`} className="text-zinc-900 hover:underline">
                    {post.title}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.author_name || '-'}</td>
                <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.view_count}</td>
                <td className="px-4 py-3 text-center text-xs text-zinc-400">
                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
            {(notices?.length ?? 0) === 0 && (posts?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-400">게시글이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/board/${slug}?page=${p}`}
              className={`rounded px-3 py-1.5 text-sm ${
                p === page ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
