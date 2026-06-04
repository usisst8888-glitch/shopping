import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const BLOCKED_PATH = '/blocked'

function pickClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || null
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim() || null
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim() || null
  return null
}

// 차단 IP 목록을 짧게 메모리 캐싱해 매 요청 DB hit 를 줄임 (에지 인스턴스 단위).
let blockedCache: { value: Set<string>; expiresAt: number } | null = null
const BLOCKED_CACHE_MS = 30_000

async function isBlocked(ip: string): Promise<boolean> {
  if (blockedCache && blockedCache.expiresAt > Date.now()) {
    return blockedCache.value.has(ip)
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  try {
    const res = await fetch(`${url}/rest/v1/blocked_ips?select=ip`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })
    if (!res.ok) return false
    const rows = (await res.json()) as { ip: string }[]
    const set = new Set(rows.map((r) => r.ip))
    blockedCache = { value: set, expiresAt: Date.now() + BLOCKED_CACHE_MS }
    return set.has(ip)
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 차단 안내 페이지와 next 내부 리소스는 제외
  const isBlockedPage = pathname.startsWith(BLOCKED_PATH)
  const ip = pickClientIp(request)
  if (ip && !isBlockedPage) {
    if (await isBlocked(ip)) {
      const url = request.nextUrl.clone()
      url.pathname = BLOCKED_PATH
      url.search = ''
      return NextResponse.rewrite(url)
    }
  }

  const response = await updateSession(request)

  // admin 미리보기 모드 cookie 관리.
  const preview = request.nextUrl.searchParams.get('preview')
  if (preview === 'draft') {
    response.cookies.set('preview-draft', '1', {
      maxAge: 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    })
  } else {
    response.cookies.delete('preview-draft')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
