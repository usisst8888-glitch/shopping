import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function BoardFeaturedSection({
  boardId,
  label,
  subtitle,
  perRow = 1,
  rows = 5,
  showMoreButton = true,
  showThumbnail = true,
  showDate = true,
}: {
  boardId: string
  label?: string
  subtitle?: string
  perRow?: number
  rows?: number
  showMoreButton?: boolean
  showThumbnail?: boolean
  showDate?: boolean
}) {
  const supabase = await createClient()

  const { data: board } = await supabase
    .from('boards')
    .select('id, name, slug, is_active')
    .eq('id', boardId)
    .eq('is_active', true)
    .single()

  if (!board) return null

  const safePerRow = Math.max(1, perRow)
  const safeRows = Math.max(1, rows)
  const limit = safePerRow * safeRows

  const { data: posts } = await supabase
    .from('board_posts')
    .select('id, title, thumbnail_url, view_count, created_at, content')
    .eq('board_id', board.id)
    .eq('is_published', true)
    .order('is_notice', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!posts || posts.length === 0) return null

  const displayLabel = label || board.name
  const isGrid = safePerRow > 1

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

  return (
    <section className="pt-4 pb-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="w-full text-lg font-semibold text-zinc-900 [&_p]:my-0"
              dangerouslySetInnerHTML={{ __html: displayLabel }}
            />
            {subtitle && (
              <div
                className="mt-1 text-sm text-zinc-500 [&_p]:my-0"
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            )}
          </div>
          {showMoreButton && (
            <Link
              href={`/board/${board.slug}`}
              className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900"
            >
              더보기 →
            </Link>
          )}
        </div>

        {isGrid ? (
          <ul
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${safePerRow}, minmax(0, 1fr))` }}
          >
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/board/${board.slug}/${p.id}`}
                  className="group flex flex-col overflow-hidden rounded-lg border border-zinc-100 bg-white transition hover:border-zinc-200 hover:shadow-sm"
                >
                  {showThumbnail && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                      {p.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-300">
                          이미지 없음
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <div className="line-clamp-2 text-sm font-medium text-zinc-900">
                      {p.title}
                    </div>
                    {showDate && (
                      <div className="mt-auto text-xs text-zinc-400">
                        {fmtDate(p.created_at)}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-zinc-100 border-y border-zinc-100">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/board/${board.slug}/${p.id}`}
                  className="flex items-center gap-4 px-2 py-3 hover:bg-zinc-50"
                >
                  {showThumbnail && p.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnail_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {p.title}
                    </div>
                    {showDate && (
                      <div className="mt-0.5 text-xs text-zinc-400">
                        {fmtDate(p.created_at)}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
