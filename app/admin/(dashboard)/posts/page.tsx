import Link from 'next/link'
import { getAdminSiteId } from '@/lib/admin-site'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getBoardCounts, getPosts } from './actions'
import { PostTable } from './post-table'

export const metadata = { title: '게시물 관리' }

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const sp = await searchParams
  const sites = await getSites()
  const siteId = await getAdminSiteId(sites)

  const page = parseInt(sp.page ?? '1') || 1
  const size = parseInt(sp.size ?? '20') || 20
  const search = sp.search ?? ''
  const boardId = sp.boardId ?? ''

  const [{ boards, total: allTotal }, { posts, total }] = await Promise.all([
    getBoardCounts(siteId),
    getPosts({ siteId, page, size, search, boardId }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / size))

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams()
    const merged = { search, boardId, page, size, ...overrides }
    if (merged.search) params.set('search', String(merged.search))
    if (merged.boardId) params.set('boardId', String(merged.boardId))
    if (merged.page && Number(merged.page) !== 1) params.set('page', String(merged.page))
    if (merged.size && Number(merged.size) !== 20) params.set('size', String(merged.size))
    const qs = params.toString()
    return `/admin/posts${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">게시물 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">게시판의 게시물을 작성하고 관리하세요.</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          게시물 작성
        </Link>
      </div>

      <div className="flex gap-6">
        {/* 사이드바: 전체 + 게시판별 */}
        <aside className="w-52 shrink-0 space-y-1">
          <Link
            href={buildUrl({ boardId: undefined, page: 1 })}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              !boardId ? 'bg-zinc-900 font-medium text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span>전체 게시물</span>
            <span className={!boardId ? 'text-white/70' : 'text-zinc-400'}>{allTotal}</span>
          </Link>
          {boards.map((b) => (
            <Link
              key={b.id}
              href={buildUrl({ boardId: b.id, page: 1 })}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                boardId === b.id ? 'bg-zinc-900 font-medium text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="truncate">{b.name}</span>
              <span className={boardId === b.id ? 'text-white/70' : 'text-zinc-400'}>{b.count}</span>
            </Link>
          ))}
        </aside>

        {/* 본문 */}
        <div className="min-w-0 flex-1">
          {/* 검색 */}
          <form method="get" className="mb-4 flex gap-2">
            {boardId && <input type="hidden" name="boardId" value={boardId} />}
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="제목, 작성자로 검색"
              className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
              검색
            </button>
            {search && (
              <Link href={buildUrl({ search: undefined, page: 1 })} className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100">
                초기화
              </Link>
            )}
          </form>

          <p className="mb-3 text-sm text-zinc-500">
            전체 <span className="font-semibold text-zinc-900">{total}</span>건
            {total > 0 && ` (${(page - 1) * size + 1}-${Math.min(page * size, total)})`}
          </p>

          <PostTable posts={posts} />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <Link
                href={buildUrl({ page: Math.max(1, page - 1) })}
                className={`rounded-lg border border-zinc-200 px-3 py-1.5 text-sm ${page <= 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-700 hover:bg-zinc-50'}`}
              >
                이전
              </Link>
              {Array.from({ length: totalPages })
                .map((_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-zinc-400">…</span>}
                    <Link
                      href={buildUrl({ page: p })}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        p === page ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
              <Link
                href={buildUrl({ page: Math.min(totalPages, page + 1) })}
                className={`rounded-lg border border-zinc-200 px-3 py-1.5 text-sm ${page >= totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-700 hover:bg-zinc-50'}`}
              >
                다음
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
