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
            className="text-sm font-medium text-zinc-900 hover:underline"
          >
            관리자 대시보드
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          로그아웃
        </button>
      </>
    )
  }

  return (
    <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
      로그인
    </Link>
  )
}
