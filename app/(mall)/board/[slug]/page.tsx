import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

type Post = {
  id: string
  title: string
  content: string | null
  author_name: string | null
  thumbnail_url: string | null
  view_count: number
  is_notice: boolean
  created_at: string
}

function getThumb(post: Post): string | null {
  if (post.thumbnail_url) return post.thumbnail_url
  if (!post.content) return null
  const match = post.content.match(/<img[^>]+src="([^"]+)"/)
  return match?.[1] ?? null
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

  const { data: notices } = await supabase
    .from('board_posts')
    .select('id, title, content, author_name, thumbnail_url, view_count, is_notice, created_at')
    .eq('board_id', board.id)
    .eq('is_notice', true)
    .order('created_at', { ascending: false })

  const from = (page - 1) * size
  const { data: posts, count } = await supabase
    .from('board_posts')
    .select('id, title, content, author_name, thumbnail_url, view_count, is_notice, created_at', { count: 'exact' })
    .eq('board_id', board.id)
    .eq('is_notice', false)
    .order('created_at', { ascending: false })
    .range(from, from + size - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / size))
  const allPosts = [...(notices ?? []), ...(posts ?? [])] as Post[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">{board.name}</h1>
      {board.description && (
        <p className="mb-6 text-sm text-zinc-500">{board.description}</p>
      )}

      <div className="mb-4 flex justify-end">
        <Link
          href={`/board/${slug}/write`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          글쓰기
        </Link>
      </div>

      {allPosts.length === 0 ? (
        <div className="py-20 text-center text-zinc-400">게시글이 없습니다.</div>
      ) : board.board_type === 'gallery' ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {allPosts.map((post) => {
            const thumb = getThumb(post)
            return (
              <Link key={post.id} href={`/board/${slug}/${post.id}`} className="group">
                <div className="aspect-square overflow-hidden bg-zinc-100">
                  {thumb ? (
                    <img src={thumb} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 없음</div>
                  )}
                </div>
                <div className="mt-2">
                  {post.is_notice && <span className="mr-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>}
                  <p className="text-sm text-zinc-900 line-clamp-1">{post.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{new Date(post.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : board.board_type === 'webzine' ? (
        <div className="space-y-6">
          {allPosts.map((post) => {
            const thumb = getThumb(post)
            const excerpt = post.content?.replace(/<[^>]*>/g, '').slice(0, 150) ?? ''
            return (
              <Link key={post.id} href={`/board/${slug}/${post.id}`} className="group flex gap-5 border-b border-zinc-100 pb-6">
                {thumb && (
                  <div className="h-32 w-48 flex-shrink-0 overflow-hidden bg-zinc-100">
                    <img src={thumb} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {post.is_notice && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>}
                    <h3 className="text-base font-bold text-zinc-900 group-hover:underline line-clamp-1">{post.title}</h3>
                  </div>
                  {excerpt && <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{excerpt}</p>}
                  <div className="mt-3 flex gap-3 text-xs text-zinc-400">
                    <span>{post.author_name || '익명'}</span>
                    <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    <span>조회 {post.view_count}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
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
              {allPosts.map((post) => (
                <tr key={post.id} className={post.is_notice ? 'bg-amber-50/50' : 'hover:bg-zinc-50'}>
                  <td className="px-4 py-3">
                    <Link href={`/board/${slug}/${post.id}`} className="text-zinc-900 hover:underline">
                      {post.is_notice && <span className="mr-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>}
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
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-1">
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
