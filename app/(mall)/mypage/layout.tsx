import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteConfig } from '@/lib/site'
import { MyPageNav, MyPageMobileTabs } from './mypage-nav'

export default async function MyPageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/mypage')
  }

  // 프로필 + 사이트(로고) 동시 로드
  const [{ data: profile }, site] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, email, points')
      .eq('id', user.id)
      .single(),
    getSiteConfig(),
  ])

  // 누적 구매금액 — 취소 외 모든 주문 합계
  const { data: orderRows } = await supabase
    .from('orders')
    .select('total_amount, status')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
  const totalPurchased = (orderRows ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  const displayName = profile?.name || (user.email?.split('@')[0] ?? '회원')
  const logoUrl = site.logo_url ?? null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 모바일 탭 */}
      <div className="mb-4 md:hidden">
        <MyPageMobileTabs />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
        {/* 사이드바 (PC) */}
        <aside className="hidden md:block">
          <MyPageNav />
        </aside>

        {/* 우측 */}
        <div className="space-y-6">
          {/* 프로필 카드 */}
          <div className="rounded-xl bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200 md:h-20 md:w-20">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-400">
                      {displayName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-zinc-900 md:text-lg">
                    {displayName} 님 안녕하세요.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 md:text-sm">
                    누적 구매금액: <span className="font-semibold text-zinc-900">{totalPurchased.toLocaleString()}</span>원
                  </p>
                </div>
              </div>
              {/* 포인트 박스 */}
              <div className="hidden border-l border-zinc-100 pl-6 text-center md:block">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">포인트</p>
                <p className="mt-1 font-mono text-2xl font-bold text-zinc-900">
                  {(profile?.points ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            {/* 모바일 포인트 */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-900 px-4 py-2.5 text-white md:hidden">
              <span className="text-xs">보유 포인트</span>
              <span className="font-mono text-base font-bold">
                {(profile?.points ?? 0).toLocaleString()} P
              </span>
            </div>
          </div>

          {/* 페이지 본문 */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  )
}
