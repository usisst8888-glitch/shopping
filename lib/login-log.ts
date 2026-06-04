import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

function pickIp(forwarded: string | null, realIp: string | null): string | null {
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  if (realIp) return realIp.trim() || null
  return null
}

export async function recordLogin(userId: string) {
  try {
    const h = await headers()
    const ip = pickIp(
      h.get('x-forwarded-for'),
      h.get('x-real-ip') ?? h.get('cf-connecting-ip'),
    )
    const ua = h.get('user-agent') ?? null

    const supabase = await createClient()
    await supabase.from('login_logs').insert({
      user_id: userId,
      ip,
      user_agent: ua,
    })
  } catch {
    // 로그인 흐름을 막지 않도록 실패 무시
  }
}
