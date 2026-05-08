import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostActions } from './post-actions'

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('board_posts')
    .select('*, boards!inner(name, slug)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // 조회수 증가
  await supabase
    .from('board_posts')
    .update({ view_count: (post.view_count ?? 0) + 1 })
    .eq('id', id)

  // 현재 유저 확인
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const canEdit = user && (user.id === post.user_id || isAdmin)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        {post.category && (
          <span className="mb-2 inline-block rounded-full bg-zinc-100 px-3 py-0.5 text-xs text-zinc-600">{post.category}</span>
        )}
        <h1 className="text-2xl font-bold text-zinc-900">{post.title}</h1>
        <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
          <span>{post.author_name || '익명'}</span>
          <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
          <span>조회 {post.view_count + 1}</span>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-8">
        {post.content ? (
          <div
            className="prose max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <p className="text-zinc-400">내용이 없습니다.</p>
        )}
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-zinc-200 pt-6">
        <Link
          href={`/board/${slug}`}
          className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          목록으로
        </Link>
        {canEdit && (
          <PostActions postId={id} boardSlug={slug} />
        )}
      </div>
    </div>
  )
}
