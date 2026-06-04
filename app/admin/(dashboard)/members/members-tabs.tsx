'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/members', label: '회원목록' },
  { href: '/admin/members/settings', label: '회원설정' },
]

export function MembersTabs() {
  const pathname = usePathname()

  return (
    <div className="flex border-b border-zinc-200">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative -mb-px px-5 py-2.5 text-sm font-medium transition ${
              active
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
