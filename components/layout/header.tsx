import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeaderAuth } from './header-auth'
import { HeaderCategories } from './header-categories'
import type { NavItem } from '@/lib/types/design'
import { getCachedCategories } from '@/lib/site'

export async function Header({
  siteName,
  navItems,
  logoUrl,
}: {
  siteName: string
  navItems?: NavItem[]
  logoUrl?: string | null
}) {
  // 유저 인증과 카테고리를 병렬로 가져옴
  const supabase = await createClient()

  const [{ data: { user } }, categories] = await Promise.all([
    supabase.auth.getUser(),
    getCachedCategories(),
  ])

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const items = navItems && navItems.length > 0 ? navItems : []

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-10 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="text-xl font-bold tracking-widest text-zinc-900">{siteName}</span>
          )}
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {items.map((item, index) => (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
          <HeaderCategories categories={categories ?? []} />
        </nav>
        <div className="flex items-center gap-4">
          <HeaderAuth user={user} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  )
}
