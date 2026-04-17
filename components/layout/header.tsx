import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeaderAuth } from './header-auth'
import { HeaderCategories } from './header-categories'
import type { NavItem } from '@/lib/types/design'

export async function Header({
  siteName,
  navItems,
}: {
  siteName: string
  navItems?: NavItem[]
}) {
  const supabase = await createClient()
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

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, parent_id, level')
    .lte('level', 2)
    .order('level')
    .order('sort_order')

  const items = navItems && navItems.length > 0 ? navItems : []

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-widest text-zinc-900">
          {siteName}
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
