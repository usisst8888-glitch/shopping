import { createClient } from '@/lib/supabase/server'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getAdminSiteId } from '@/lib/admin-site'

export const metadata = { title: '페이지 통계' }

type PageStat = {
  path: string
  page_views: number
  visitors: number
}

type DailyPageStat = {
  date: string
  path: string
  page_views: number
  visitors: number
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days: daysParam } = await searchParams
  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)
  const days = parseInt(daysParam ?? '7') || 7

  if (!currentSiteId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">페이지 통계</h1>
        <p className="text-sm text-zinc-500">사이트를 먼저 선택해주세요.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (days - 1))

  const { data } = await supabase
    .from('page_stats')
    .select('date, path, page_views, visitors')
    .eq('site_id', currentSiteId)
    .gte('date', startDate.toISOString().slice(0, 10))
    .lte('date', today.toISOString().slice(0, 10))
    .order('date', { ascending: false })

  const allStats = (data ?? []) as DailyPageStat[]

  // 페이지별 합산
  const pageMap = new Map<string, { page_views: number; visitors: number }>()
  for (const s of allStats) {
    const prev = pageMap.get(s.path) ?? { page_views: 0, visitors: 0 }
    pageMap.set(s.path, {
      page_views: prev.page_views + s.page_views,
      visitors: prev.visitors + s.visitors,
    })
  }

  const pageRanking: (PageStat & { rank: number })[] = [...pageMap.entries()]
    .map(([path, stat]) => ({ path, ...stat }))
    .sort((a, b) => b.visitors - a.visitors)
    .map((item, i) => ({ ...item, rank: i + 1 }))

  const totalViews = pageRanking.reduce((sum, p) => sum + p.page_views, 0)
  const totalVisitors = pageRanking.reduce((sum, p) => sum + p.visitors, 0)

  // 일별 통계
  const dateMap = new Map<string, { page_views: number; visitors: number }>()
  for (const s of allStats) {
    const prev = dateMap.get(s.date) ?? { page_views: 0, visitors: 0 }
    dateMap.set(s.date, {
      page_views: prev.page_views + s.page_views,
      visitors: prev.visitors + s.visitors,
    })
  }

  const dateStats = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const stat = dateMap.get(dateStr)
    return {
      date: dateStr,
      page_views: stat?.page_views ?? 0,
      visitors: stat?.visitors ?? 0,
    }
  })

  function getPageLabel(path: string) {
    if (path === '/') return '메인 페이지'
    if (path.startsWith('/category/')) return `카테고리: ${path.split('/')[2]?.slice(0, 8)}...`
    if (path.startsWith('/product/')) return `상품: ${path.split('/')[2]?.slice(0, 8)}...`
    return path
  }

  const dayOptions = [7, 14, 30]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">페이지 통계</h1>
        <div className="flex gap-1.5">
          {dayOptions.map((d) => (
            <a
              key={d}
              href={`/admin/stats?days=${d}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                days === d
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {d}일
            </a>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">총 페이지수</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{pageRanking.length}개</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">총 방문자 (중복제외)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totalVisitors.toLocaleString()}명</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">총 페이지뷰</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totalViews.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 페이지 랭킹 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            인기 페이지 TOP {Math.min(pageRanking.length, 20)}
          </h2>
          {pageRanking.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">아직 데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="py-2 text-left font-medium text-zinc-500">순위</th>
                    <th className="py-2 text-left font-medium text-zinc-500">페이지</th>
                    <th className="py-2 text-right font-medium text-zinc-500">방문자</th>
                    <th className="py-2 text-right font-medium text-zinc-500">페이지뷰</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRanking.slice(0, 20).map((page) => {
                    const barWidth = totalVisitors > 0
                      ? Math.round((page.visitors / pageRanking[0].visitors) * 100)
                      : 0
                    return (
                      <tr key={page.path} className="group border-b border-zinc-50 hover:bg-zinc-50">
                        <td className="py-2.5">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            page.rank <= 3
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {page.rank}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div>
                            <p className="font-medium text-zinc-900">{getPageLabel(page.path)}</p>
                            <p className="text-xs text-zinc-400">{page.path}</p>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-medium text-zinc-900">
                          {page.visitors.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right text-zinc-600">
                          {page.page_views.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 일별 통계 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">일별 페이지 방문</h2>
          {dateStats.every((d) => d.visitors === 0) ? (
            <p className="py-8 text-center text-sm text-zinc-400">아직 데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="py-2 text-left font-medium text-zinc-500">일자</th>
                    <th className="py-2 text-right font-medium text-zinc-500">방문자</th>
                    <th className="py-2 text-right font-medium text-zinc-500">페이지뷰</th>
                  </tr>
                </thead>
                <tbody>
                  {dateStats.map((d) => (
                    <tr key={d.date} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="py-2 text-zinc-700">
                        {d.date}
                        {d.date === today.toISOString().slice(0, 10) && (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                            오늘
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-zinc-700">{d.visitors.toLocaleString()}</td>
                      <td className="py-2 text-right text-zinc-700">{d.page_views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
