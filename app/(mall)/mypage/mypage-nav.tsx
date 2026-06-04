'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV: { href: string; label: string }[] = [
  { href: '/mypage', label: '주문 조회' },
  { href: '/mypage/wishlist', label: '위시 리스트' },
  { href: '/mypage/points', label: '포인트' },
  { href: '/mypage/inquiry', label: '1:1 문의' },
  { href: '/mypage/edit', label: '정보 수정' },
  { href: '/mypage/withdraw', label: '회원탈퇴' },
]

export function MyPageNav() {
  const pathname = usePathname()
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-md px-3 py-2 text-sm transition ${
              active
                ? 'font-semibold text-zinc-900 underline underline-offset-4'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MyPageMobileTabs() {
  const pathname = usePathname()
  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-1.5 px-1">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
