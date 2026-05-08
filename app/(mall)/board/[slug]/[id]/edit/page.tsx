import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditForm } from './edit-form'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: post } = await supabase
    .from('board_posts')
    .select('*, boards!inner(name, slug, board_categories)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  if (post.user_id !== user.id && !isAdmin) redirect(`/board/${slug}`)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">{(post.boards as any).name} - 수정</h1>
      <EditForm
        postId={id}
        boardSlug={slug}
        title={post.title}
        content={post.content ?? ''}
        category={post.category ?? ''}
        isNotice={post.is_notice}
        isAdmin={isAdmin}
        boardCategories={(post.boards as any).board_categories ?? []}
      />
    </div>
  )
}
