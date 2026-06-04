'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { NavItem, NavSubItem } from '@/lib/types/design'
import { Spinner } from '@/components/spinner'

type Category = { id: string; name: string; slug: string | null; parent_id: string | null; level: number }

export function MobileMenu({
  user,
  isAdmin,
  navItems,
  categories: _categories, // 사이드바에서는 navItems 만 노출 (카테고리는 별도 페이지 진입)
}: {
  user: User | null
  isAdmin: boolean
  navItems: NavItem[]
  categories: Category[]
}) {
  void _categories
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
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
                <Link href="/mypage" onClick={close} className="block text-[13px] text-zinc-700">마이페이지</Link>
                <Link href="/mypage" onClick={close} className="block text-[13px] text-zinc-700">주문내역</Link>
                <Link href="/mypage/wishlist" onClick={close} className="block text-[13px] text-zinc-700">위시 리스트</Link>
                <Link href="/mypage/points" onClick={close} className="block text-[13px] text-zinc-700">포인트</Link>
                <Link href="/mypage/inquiry" onClick={close} className="block text-[13px] text-zinc-700">1:1 문의</Link>
                <Link href="/cart" onClick={close} className="block text-[13px] text-zinc-700">장바구니</Link>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 disabled:opacity-60"
                >
                  {loggingOut && <Spinner className="h-3 w-3" />}
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
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
            <div className="px-5 py-4">
              <div className="space-y-1">
                {navItems.map((item, index) => {
                  const key1 = `n-${index}`
                  const hasChildren1 = !!item.children && item.children.length > 0
                  const isExp1 = expanded.has(key1)
                  if (!hasChildren1) {
                    return (
                      <Link
                        key={key1}
                        href={item.href}
                        onClick={close}
                        className="block py-1.5 text-[13px] font-bold text-[#484848]"
                      >
                        {item.label}
                      </Link>
                    )
                  }
                  return (
                    <div key={key1}>
                      <div className="flex items-center justify-between">
                        <Link
                          href={item.href}
                          onClick={close}
                          className="flex-1 py-1.5 text-[13px] font-bold text-[#484848]"
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleExpand(key1)}
                          aria-label={isExp1 ? '접기' : '펼치기'}
                          className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${isExp1 ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {isExp1 && (
                        <div className="mt-1 mb-2 space-y-0.5 border-l border-zinc-200 pl-3">
                          {item.children!.map((sub: NavSubItem, subIndex) => {
                            const key2 = `${key1}-${subIndex}`
                            const hasChildren2 = !!sub.children && sub.children.length > 0
                            const isExp2 = expanded.has(key2)
                            if (!hasChildren2) {
                              return (
                                <Link
                                  key={key2}
                                  href={sub.href}
                                  onClick={close}
                                  className="block py-1 text-[12px] text-zinc-600"
                                >
                                  {sub.label}
                                </Link>
                              )
                            }
                            return (
                              <div key={key2}>
                                <div className="flex items-center justify-between">
                                  <Link
                                    href={sub.href}
                                    onClick={close}
                                    className="flex-1 py-1 text-[12px] text-zinc-600"
                                  >
                                    {sub.label}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(key2)}
                                    aria-label={isExp2 ? '접기' : '펼치기'}
                                    className="cursor-pointer rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <svg
                                      className={`h-3 w-3 transition-transform ${isExp2 ? 'rotate-180' : ''}`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                                {isExp2 && (
                                  <div className="mt-1 mb-1.5 space-y-0.5 border-l border-zinc-200 pl-3">
                                    {sub.children!.map((leaf, leafIndex) => (
                                      <Link
                                        key={`${key2}-${leafIndex}`}
                                        href={leaf.href}
                                        onClick={close}
                                        className="block py-1 text-[11px] text-zinc-500"
                                      >
                                        {leaf.label}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
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
