import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSiteId } from '@/lib/admin-site'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getBoards } from '@/app/admin/(dashboard)/boards/actions'
import { getPost } from '../../actions'
import { PostForm } from '../../post-form'

export const metadata = { title: '게시물 수정' }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sites = await getSites()
  const siteId = await getAdminSiteId(sites)
  const [boards, post] = await Promise.all([getBoards(siteId), getPost(id)])

  if (!post) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/posts" className="text-sm text-zinc-500 hover:text-zinc-900">← 게시물 관리</Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">게시물 수정</h1>
      </div>
      <PostForm boards={boards.map((b) => ({ id: b.id, name: b.name, board_categories: b.board_categories }))} post={post} />
    </div>
  )
}
