import Link from 'next/link'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { ShareButton } from '@/components/mall/share-button'

function ratioStr(r?: string) {
  return (r || '4:3').replace(':', ' / ')
}
function formatDate(iso: string, withTime: boolean) {
  const d = new Date(iso)
  return withTime
    ? d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ko-KR')
}
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
  category?: string | null
  like_count?: number
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
  searchParams: Promise<{ page?: string; cat?: string; q?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1') || 1
  const filterCat = sp.cat ?? ''
  const q = sp.q?.trim() ?? ''

  const supabase = await createClient()

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', decodeURIComponent(slug))
    .eq('is_active', true)
    .single()

  if (!board) notFound()

  // 페이지 크기 = 세로 줄 수 × 한 줄 갯수(갤러리/웹진은 cols_desktop, 리스트는 1)
  const baseRows = board.visible_rows || 12
  const gridCols = board.board_type === 'gallery' || board.board_type === 'webzine' ? (board.cols_desktop || 4) : 1
  const size = Math.max(1, baseRows * gridCols)

  const { data: notices } = await supabase
    .from('board_posts')
    .select('id, title, content, author_name, thumbnail_url, view_count, is_notice, category, like_count, created_at')
    .eq('board_id', board.id)
    .eq('is_notice', true)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const from = (page - 1) * size
  let postsQuery = supabase
    .from('board_posts')
    .select('id, title, content, author_name, thumbnail_url, view_count, is_notice, category, like_count, created_at', { count: 'exact' })
    .eq('board_id', board.id)
    .eq('is_notice', false)
    .eq('is_published', true)
  if (filterCat) {
    postsQuery = postsQuery.eq('category', filterCat)
  }
  if (q) {
    postsQuery = postsQuery.ilike('title', `%${q}%`)
  }
  const { data: posts, count } = await postsQuery
    .order('created_at', { ascending: false })
    .range(from, from + size - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / size))
  const allPosts = [...(notices ?? []), ...(posts ?? [])] as Post[]

  // 갤러리 grid: keep_cols_on_expand=false면 화면 폭에 따라 자동 확장(auto-fit)
  const galleryClass = board.keep_cols_on_expand === false
    ? 'grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]'
    : 'grid [grid-template-columns:repeat(var(--cols-m),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--cols-d),minmax(0,1fr))]'
  const galleryStyle: CSSProperties = board.keep_cols_on_expand === false
    ? { gap: `${board.gap_px ?? 30}px` }
    : ({
        '--cols-m': board.cols_mobile ?? 2,
        '--cols-d': board.cols_desktop ?? 4,
        gap: `${board.gap_px ?? 30}px`,
      } as CSSProperties)

  return (
    <>
      {/* 상단 배너 (영상 우선) */}
      {(board.banner_video_url || board.banner_url) && (
        <div className="relative mx-auto max-w-[1920px]">
          <div className="h-[160px] overflow-hidden md:h-[320px]">
            {board.banner_video_url ? (
              <video src={board.banner_video_url} autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={board.banner_url} alt={board.name} className="h-full w-full object-cover" />
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-12">
      {board.show_board_name !== false && (
        <h1 className="mb-2 text-2xl font-bold text-zinc-900">
          {board.name}
          {board.show_total_count && (
            <span className="ml-2 text-base font-medium text-zinc-400">({count ?? 0})</span>
          )}
        </h1>
      )}
      {board.description && (
        <p className="mb-6 text-sm text-zinc-500">{board.description}</p>
      )}

      {board.show_search && (
        <form method="get" className="mb-4 flex gap-2">
          {filterCat && <input type="hidden" name="cat" value={filterCat} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="제목 검색"
            className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            검색
          </button>
        </form>
      )}

      <div className="mb-4 flex items-center justify-between">
        {/* 카테고리 탭 */}
        {board.board_categories && board.board_categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/board/${slug}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !filterCat ? 'bg-zinc-900 text-white' : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400'
              }`}
            >
              전체
            </Link>
            {board.board_categories.map((cat: string) => (
              <Link
                key={cat}
                href={`/board/${slug}?cat=${encodeURIComponent(cat)}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filterCat === cat ? 'bg-zinc-900 text-white' : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        ) : <div />}
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
        <div className={galleryClass} style={galleryStyle}>
          {allPosts.map((post) => {
            const thumb = getThumb(post)
            const excerpt = post.content?.replace(/<[^>]*>/g, '').trim() ?? ''
            return (
              <Link
                key={post.id}
                href={`/board/${slug}/${post.id}`}
                className="group block overflow-hidden border border-zinc-200 bg-white"
                style={{ borderRadius: `${board.border_radius ?? 0}px`, borderWidth: `${board.border_width ?? 1}px` }}
              >
                <div className="overflow-hidden bg-zinc-100" style={{ aspectRatio: ratioStr(board.image_ratio) }}>
                  {thumb ? (
                    <img src={thumb} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 없음</div>
                  )}
                </div>
                <div style={{ padding: `${board.padding_px ?? 20}px`, textAlign: (board.text_align as CSSProperties['textAlign']) ?? 'left' }}>
                  <div className="flex flex-wrap items-center gap-1">
                    {post.is_notice && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>}
                    {board.show_category && post.category && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">{post.category}</span>}
                  </div>
                  <p className="mt-1 line-clamp-1 font-medium text-zinc-900" style={{ fontSize: `${board.title_font_size ?? 14}px`, color: board.title_color || undefined }}>{post.title}</p>
                  {board.show_content_preview !== false && excerpt && (
                    <p className="mt-1 text-zinc-500" style={{ fontSize: `${board.content_font_size ?? 12}px`, color: board.content_color || undefined, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: board.content_preview_lines ?? 1, overflow: 'hidden' }}>{excerpt}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
                    {board.show_profile_image && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] text-zinc-500">
                        {(post.author_name || '?').slice(0, 1)}
                      </span>
                    )}
                    {board.show_author_name !== false && <span>{post.author_name || '익명'}</span>}
                    <span>{formatDate(post.created_at, !!board.show_created_time)}</span>
                    {board.show_view_count !== false && <span>조회 {post.view_count}</span>}
                    {board.show_like_count && <span>♡ {post.like_count ?? 0}</span>}
                    {board.show_comment_count && <span>💬 0</span>}
                    {board.show_share && <ShareButton inline path={`/board/${slug}/${post.id}`} title={post.title} />}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : board.board_type === 'webzine' ? (
        <div className="space-y-6">
          {allPosts.map((post) => {
            const thumb = getThumb(post)
            const excerpt = post.content?.replace(/<[^>]*>/g, '').trim() ?? ''
            return (
              <Link key={post.id} href={`/board/${slug}/${post.id}`} className="group flex gap-5 border-b border-zinc-100 pb-6">
                {thumb && (
                  <div
                    className="h-32 w-48 flex-shrink-0 overflow-hidden bg-zinc-100"
                    style={{ aspectRatio: ratioStr(board.image_ratio), borderRadius: `${board.border_radius ?? 0}px` }}
                  >
                    <img src={thumb} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                )}
                <div className="flex-1" style={{ textAlign: (board.text_align as CSSProperties['textAlign']) ?? 'left' }}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.is_notice && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>}
                    {board.show_category && post.category && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">{post.category}</span>}
                    <h3 className="line-clamp-1 font-bold text-zinc-900 group-hover:underline" style={{ fontSize: `${(board.title_font_size ?? 14) + 2}px`, color: board.title_color || undefined }}>{post.title}</h3>
                  </div>
                  {board.show_content_preview !== false && excerpt && (
                    <p className="mt-2 text-zinc-500" style={{ fontSize: `${board.content_font_size ?? 12}px`, color: board.content_color || undefined, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: board.content_preview_lines ?? 2, overflow: 'hidden' }}>{excerpt}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                    {board.show_profile_image && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] text-zinc-500">
                        {(post.author_name || '?').slice(0, 1)}
                      </span>
                    )}
                    {board.show_author_name !== false && <span>{post.author_name || '익명'}</span>}
                    <span>{formatDate(post.created_at, !!board.show_created_time)}</span>
                    {board.show_view_count !== false && <span>조회 {post.view_count}</span>}
                    {board.show_like_count && <span>♡ {post.like_count ?? 0}</span>}
                    {board.show_comment_count && <span>💬 0</span>}
                    {board.show_share && <ShareButton inline path={`/board/${slug}/${post.id}`} title={post.title} />}
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
                {board.show_category && (
                  <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 100 }}>카테고리</th>
                )}
                {board.show_author_name !== false && (
                  <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 100 }}>작성자</th>
                )}
                {board.show_view_count !== false && (
                  <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 80 }}>조회</th>
                )}
                {board.show_like_count && (
                  <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 80 }}>좋아요</th>
                )}
                {board.show_comment_count && (
                  <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 80 }}>댓글</th>
                )}
                {board.show_share && (
                  <th className="hidden px-4 py-3 text-center font-medium text-zinc-500 md:table-cell" style={{ width: 80 }}>공유</th>
                )}
                <th className="px-4 py-3 text-center font-medium text-zinc-500" style={{ width: 100 }}>날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {allPosts.map((post) => (
                <tr key={post.id} className={post.is_notice ? 'bg-amber-50/50' : 'hover:bg-zinc-50'}>
                  <td className="px-4 py-3" style={{ fontSize: `${board.title_font_size ?? 14}px`, color: board.title_color || undefined }}>
                    <Link href={`/board/${slug}/${post.id}`} className="hover:underline" style={{ color: board.title_color || undefined }}>
                      {post.is_notice && <span className="mr-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">공지</span>}
                      {post.title}
                    </Link>
                  </td>
                  {board.show_category && (
                    <td className="hidden px-4 py-3 text-center text-xs text-zinc-500 md:table-cell">{post.category || '-'}</td>
                  )}
                  {board.show_author_name !== false && (
                    <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.author_name || '-'}</td>
                  )}
                  {board.show_view_count !== false && (
                    <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.view_count}</td>
                  )}
                  {board.show_like_count && (
                    <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">{post.like_count ?? 0}</td>
                  )}
                  {board.show_comment_count && (
                    <td className="hidden px-4 py-3 text-center text-zinc-500 md:table-cell">0</td>
                  )}
                  {board.show_share && (
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      <ShareButton inline path={`/board/${slug}/${post.id}`} title={post.title} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-center text-xs text-zinc-400">
                    {formatDate(post.created_at, !!board.show_created_time)}
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
    </>
  )
}
