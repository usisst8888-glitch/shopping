'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { Spinner } from '@/components/spinner'
import {
  type HeaderAuthConfig,
  type HeaderAuthItem,
  DEFAULT_HEADER_AUTH_CONFIG,
  formatBubbleText,
} from '@/lib/header-auth-config'
import { NotificationBell } from './notification-bell'
import type { NotificationRow } from '@/lib/notifications-client-actions'

export function HeaderAuth({
  user,
  isAdmin,
  signupBonus = 0,
  config = DEFAULT_HEADER_AUTH_CONFIG,
  notifications,
}: {
  user: User | null
  isAdmin: boolean
  signupBonus?: number
  config?: HeaderAuthConfig
  notifications?: { list: NotificationRow[]; unread: number }
}) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  const items = user ? config.logged_in_items : config.anon_items
  const visibleItems = items.filter((it) => {
    if (!it.visible) return false
    if (it.type === 'link' && it.adminOnly && !isAdmin) return false
    return true
  })

  const itemTextStyle = {
    fontSize: `${config.font_size}px`,
    color: config.color,
  }

  function renderItem(it: HeaderAuthItem) {
    if (it.type === 'link') {
      // 회원가입 항목 위에 보너스 말풍선
      const isSignup = it.href === '/signup'
      const showBubble = isSignup && signupBonus > 0
      const link = (
        <Link href={it.href} className="hover:underline" style={itemTextStyle}>
          {it.label}
        </Link>
      )
      if (!showBubble) return <span key={it.id}>{link}</span>
      return (
        <span key={it.id} className="relative">
          <span
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold shadow-md"
            style={{ backgroundColor: config.bubble_bg, color: config.bubble_color }}
            aria-hidden
          >
            {formatBubbleText(it.label && config.bubble_text ? config.bubble_text : '+{point}원', signupBonus)}
            <span
              className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent"
              style={{ borderTopColor: config.bubble_bg }}
            />
          </span>
          {link}
        </span>
      )
    }
    if (it.type === 'logout') {
      return (
        <button
          key={it.id}
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-1 hover:underline disabled:opacity-60"
          style={itemTextStyle}
        >
          {loggingOut && <Spinner className="h-3 w-3" />}
          {loggingOut ? '로그아웃 중...' : it.label || '로그아웃'}
        </button>
      )
    }
    if (it.type === 'bell') {
      if (!user || !notifications) return null
      return (
        <NotificationBell
          key={it.id}
          initialList={notifications.list}
          initialUnread={notifications.unread}
        />
      )
    }
    return null
  }

  return <>{visibleItems.map(renderItem)}</>
}
