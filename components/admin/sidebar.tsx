import type { User } from '@supabase/supabase-js'
import type { Site } from '@/app/admin/(dashboard)/settings/actions'
import Link from 'next/link'
import { LogoutButton } from './logout-button'
import { SidebarSiteSelector } from './sidebar-site-selector'

const navItems = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/stats', label: '페이지 통계' },
  { href: '/admin/design', label: '디자인 관리' },
  { href: '/admin/categories', label: '카테고리 관리' },
  { href: '/admin/products', label: '상품 관리' },
  { href: '/admin/members', label: '회원 관리' },
  { href: '/admin/boards', label: '게시판 관리' },
  { href: '/admin/seo', label: 'SEO 설정' },
  { href: '/admin/settings', label: '설정' },
]

export function AdminSidebar({
  user,
  sites,
  currentSiteId,
}: {
  user: User
  sites: Site[]
  currentSiteId: string
}) {
  return (
    <aside className="flex w-64 flex-col bg-zinc-900 text-white">
      <div className="space-y-3 p-6">
        <p className="text-xs text-zinc-400">사이트 선택</p>
        <SidebarSiteSelector sites={sites} currentSiteId={currentSiteId} />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-2 border-t border-zinc-800 p-4">
        <Link
          href="/"
          className="flex items-center rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          사이트 메인으로
        </Link>
        <p className="truncate px-3 text-xs text-zinc-400">{user.email}</p>
        <LogoutButton />
      </div>
    </aside>
  )
}
