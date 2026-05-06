import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WriteForm } from './write-form'

export default async function WritePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: board } = await supabase
    .from('boards')
    .select('id, name, slug')
    .eq('slug', decodeURIComponent(slug))
    .eq('is_active', true)
    .single()

  if (!board) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">{board.name} - 글쓰기</h1>
      <WriteForm
        boardId={board.id}
        boardSlug={board.slug}
        userId={user.id}
        userName={profile?.name || user.email?.split('@')[0] || '익명'}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  )
}
