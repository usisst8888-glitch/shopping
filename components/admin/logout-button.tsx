'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/spinner'

export function LogoutButton() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white disabled:opacity-60"
    >
      {loggingOut && <Spinner className="h-3 w-3" />}
      {loggingOut ? '로그아웃 중...' : '로그아웃'}
    </button>
  )
}
