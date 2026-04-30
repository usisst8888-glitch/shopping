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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      {/* 상단: 로고 가운데 + 우측 로그인 */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-5 pb-2">
        <div className="w-32" />
        <Link href="/" className="flex items-center">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-12 w-auto max-w-[220px] object-contain" />
          ) : (
            <span className="text-2xl font-bold tracking-widest text-zinc-900">{siteName}</span>
          )}
        </Link>
        <div className="flex w-32 items-center justify-end gap-4">
          <HeaderAuth user={user} isAdmin={isAdmin} />
        </div>
      </div>

      {/* 하단: 메뉴 가운데 */}
      {(items.length > 0 || (categories && categories.length > 0)) && (
        <div>
          <nav className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 pb-3 pt-1">
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
        </div>
      )}
    </header>
  )
}
