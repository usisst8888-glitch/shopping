'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export function HeaderAuth({ user, isAdmin }: { user: User | null; isAdmin: boolean }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (user) {
    return (
      <>
        {isAdmin && (
          <Link
            href="/admin"
            className="text-[12px] text-[#2a2a2a] hover:underline"
          >
            관리자
          </Link>
        )}
        <Link
          href="/cart"
          className="text-[12px] text-[#2a2a2a] hover:underline"
        >
          장바구니
        </Link>
        <button
          onClick={handleLogout}
          className="text-[12px] text-[#2a2a2a] hover:underline"
        >
          로그아웃
        </button>
      </>
    )
  }

  return (
    <>
      <Link href="/login" className="text-[12px] text-[#2a2a2a] hover:underline">
        로그인
      </Link>
      <Link href="/signup" className="text-[12px] text-[#2a2a2a] hover:underline">
        회원가입
      </Link>
      <Link href="/cart" className="text-[12px] text-[#2a2a2a] hover:underline">
        장바구니
      </Link>
    </>
  )
}
