import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeaderAuth } from './header-auth'
import { NavDropdown } from './nav-dropdown'
import { MobileMenu } from './mobile-menu'
import { CategoryMenu } from './category-menu'
import type { NavItem } from '@/lib/types/design'
import { getCachedCategories } from '@/lib/site'
import { HeaderSearch } from './header-search'
import { NotificationBell } from './notification-bell'
import { getMyNotifications } from '@/lib/notifications-client-actions'
import { getCurrentMemberSettings } from '@/lib/member-settings'
import { getHeaderAuthConfig } from '@/lib/header-auth-config'

export async function Header({
  siteName,
  navItems,
  logoUrl,
  navFontSize,
  navColor,
  navHoverColor,
  headerAuthConfigRaw,
}: {
  siteName: string
  navItems?: NavItem[]
  logoUrl?: string | null
  navFontSize?: number | null
  navColor?: string | null
  navHoverColor?: string | null
  headerAuthConfigRaw?: unknown
}) {
  const headerAuthConfig = getHeaderAuthConfig(headerAuthConfigRaw)
  const fontSize = navFontSize || 13
  const color = navColor || '#484848'
  const hoverColor = navHoverColor || '#18181b'
  const navStyle = {
    fontSize: `${fontSize}px`,
    color,
    '--nav-hover': hoverColor,
  } as React.CSSProperties
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

  // 알림 (로그인 시만)
  const notifications = user ? await getMyNotifications(30) : { list: [], unread: 0 }

  // 가입 보너스 포인트 (비로그인 + 0 초과인 경우만 말풍선 노출)
  const signupBonus = user ? 0 : (await getCurrentMemberSettings()).signup_bonus_points

  const items = navItems && navItems.length > 0 ? navItems : []

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-white/80 backdrop-blur-md">
      {/* 한 줄 — 좌측(검색) / 가운데(로고) / 우측(메뉴+알림) */}
      <div className="mx-auto max-w-7xl px-4 pt-2 pb-2 md:pt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* 좌측 — 햄버거(모바일) + 검색(PC) */}
          <div className="flex items-center gap-2">
            <MobileMenu
              user={user}
              isAdmin={isAdmin}
              navItems={items}
              categories={categories ?? []}
            />
            <div className="hidden md:block">
              <HeaderSearch />
            </div>
          </div>

          {/* 가운데 — 로고 (정 가운데 정렬) */}
          <Link href="/" className="flex items-center justify-self-center py-1 md:py-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto max-w-[160px] object-contain md:h-12 md:max-w-[220px]" />
            ) : (
              <span className="text-xl tracking-widest text-zinc-900 md:text-4xl" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{siteName}</span>
            )}
          </Link>

          {/* 우측 — PC: 메뉴 + 알림 / 모바일: 알림 + 카트 */}
          <div className="justify-self-end">
            <div
              data-header-auth
              className="hidden items-center gap-4 md:flex"
            >
              <HeaderAuth
                user={user}
                isAdmin={isAdmin}
                signupBonus={signupBonus}
                config={headerAuthConfig}
                notifications={notifications}
              />
            </div>
            <div className="flex items-center gap-1 md:hidden">
              {user && (
                <NotificationBell initialList={notifications.list} initialUnread={notifications.unread} />
              )}
              <Link
                href="/cart"
                aria-label="장바구니"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#2a2a2a] hover:bg-zinc-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="hidden md:block">
          <div className="relative mx-auto max-w-7xl px-4">
            <div className="absolute left-4 top-0">
              <CategoryMenu items={items} />
            </div>
            <nav data-nav-widget="true" className="flex items-center justify-center">
            {items.map((item, index) => (
              item.children && item.children.length > 0 ? (
                <NavDropdown
                  key={`${item.href}-${index}`}
                  item={item}
                  fontSize={fontSize}
                  color={color}
                  hoverColor={hoverColor}
                />
              ) : (
                <Link
                  key={`${item.href}-${index}`}
                  href={item.href}
                  className="px-5 font-bold transition-colors hover:text-[color:var(--nav-hover)]"
                  style={{ ...navStyle, height: '50px', display: 'flex', alignItems: 'center' }}
                >
                  {item.label}
                </Link>
              )
            ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
