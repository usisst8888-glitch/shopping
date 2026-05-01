import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeaderAuth } from './header-auth'
import { HeaderCategories } from './header-categories'
import { MobileMenu } from './mobile-menu'
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
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-5 pb-2">
        {/* 좌측: PC 빈공간 / 모바일 햄버거 */}
        <div className="w-50">
          <MobileMenu
            user={user}
            isAdmin={isAdmin}
            navItems={items}
            categories={categories ?? []}
          />
        </div>

        {/* 로고 가운데 */}
        <Link href="/" className="flex items-center">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-12 w-auto max-w-[220px] object-contain" />
          ) : (
            <span className="text-2xl font-bold tracking-widest text-zinc-900">{siteName}</span>
          )}
        </Link>

        {/* 우측: PC 로그인/장바구니 */}
        <div className="hidden w-50 items-center justify-end gap-4 md:flex">
          <HeaderAuth user={user} isAdmin={isAdmin} />
        </div>
        {/* 모바일: 장바구니 아이콘만 */}
        <div className="flex w-50 items-center justify-end md:hidden">
          <Link href="/cart">
            <svg className="h-5 w-5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* PC 메뉴 */}
      {(items.length > 0 || (categories && categories.length > 0)) && (
        <div className="hidden md:block">
          <nav className="mx-auto flex max-w-7xl items-center justify-center px-4 pb-3 pt-1">
            {items.map((item, index) => (
              <Link
                key={`${item.href}-${index}`}
                href={item.href}
                className="px-5 text-[13px] font-bold text-[#484848] hover:text-zinc-900"
                style={{ height: '50px', display: 'flex', alignItems: 'center' }}
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
