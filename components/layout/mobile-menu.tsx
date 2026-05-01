'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type NavItem = { label: string; href: string }
type Category = { id: string; name: string; slug: string | null; parent_id: string | null; level: number }

export function MobileMenu({
  user,
  isAdmin,
  navItems,
  categories,
}: {
  user: User | null
  isAdmin: boolean
  navItems: NavItem[]
  categories: Category[]
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const level1 = categories.filter((c) => c.level === 1)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.refresh()
  }

  function close() {
    setOpen(false)
  }

  const panel = (
    <div className="fixed inset-0 z-[9999] md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <span className="text-sm font-bold text-zinc-900">메뉴</span>
          <button onClick={close}>
            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 57px)' }}>
          <div className="border-b border-zinc-100 px-5 py-4">
            {user ? (
              <div className="space-y-3">
                {isAdmin && (
                  <Link href="/admin" onClick={close} className="block text-[13px] text-zinc-700">관리자</Link>
                )}
                <Link href="/cart" onClick={close} className="block text-[13px] text-zinc-700">장바구니</Link>
                <button onClick={handleLogout} className="block text-[13px] text-zinc-500">로그아웃</button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link href="/login" onClick={close} className="block text-[13px] text-zinc-700">로그인</Link>
                <Link href="/signup" onClick={close} className="block text-[13px] text-zinc-700">회원가입</Link>
                <Link href="/cart" onClick={close} className="block text-[13px] text-zinc-700">장바구니</Link>
              </div>
            )}
          </div>
          {navItems.length > 0 && (
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="space-y-3">
                {navItems.map((item, index) => (
                  <Link key={`${item.href}-${index}`} href={item.href} onClick={close} className="block text-[13px] font-bold text-[#484848]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {level1.length > 0 && (
            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">카테고리</p>
              <div className="space-y-2.5">
                {level1.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.slug || cat.id}`} onClick={close} className="block text-[13px] text-zinc-700">
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center md:hidden">
        <svg className="h-6 w-6 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      {mounted && open && createPortal(panel, document.body)}
    </>
  )
}
