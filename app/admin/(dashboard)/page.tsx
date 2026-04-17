import { createClient } from '@/lib/supabase/server'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getAdminSiteId } from '@/lib/admin-site'

export const metadata = { title: '대시보드' }

type DailyStat = {
  date: string
  visitors: number
  page_views: number
}

async function getStats(siteId: string) {
  const supabase = await createClient()
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  const { data } = await supabase
    .from('daily_stats')
    .select('date, visitors, page_views')
    .eq('site_id', siteId)
    .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
    .lte('date', today.toISOString().slice(0, 10))
    .order('date', { ascending: true })

  return (data ?? []) as DailyStat[]
}

export default async function AdminDashboard() {
  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)

  if (!currentSiteId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500">
          사이드바에서 사이트를 선택하거나, 설정에서 사이트를 먼저 등록해주세요.
        </p>
      </div>
    )
  }

  const stats = await getStats(currentSiteId)

  // 최근 7일 데이터 생성 (데이터 없는 날은 0으로)
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })

  const statsMap = new Map(stats.map((s) => [s.date, s]))

  const weeklyStats = last7Days.map((date) => ({
    date,
    visitors: statsMap.get(date)?.visitors ?? 0,
    page_views: statsMap.get(date)?.page_views ?? 0,
  }))

  const monthlyStats = last30Days.map((date) => ({
    date,
    visitors: statsMap.get(date)?.visitors ?? 0,
    page_views: statsMap.get(date)?.page_views ?? 0,
  }))

  const todayStr = today.toISOString().slice(0, 10)
  const todayStat = statsMap.get(todayStr)

  const total7 = weeklyStats.reduce(
    (acc, d) => ({
      visitors: acc.visitors + d.visitors,
      page_views: acc.page_views + d.page_views,
    }),
    { visitors: 0, page_views: 0 },
  )

  const total30 = monthlyStats.reduce(
    (acc, d) => ({
      visitors: acc.visitors + d.visitors,
      page_views: acc.page_views + d.page_views,
    }),
    { visitors: 0, page_views: 0 },
  )

  // 차트 계산
  const maxValue = Math.max(...weeklyStats.map((d) => Math.max(d.page_views, d.visitors)), 1)
  const chartHeight = 200
  const chartWidth = 600
  const padding = 30

  const pvPoints = weeklyStats.map((d, i) => ({
    x: padding + (i * (chartWidth - padding * 2)) / (weeklyStats.length - 1),
    y: chartHeight - padding - (d.page_views / (maxValue * 1.2)) * (chartHeight - padding * 2),
  }))

  const vPoints = weeklyStats.map((d, i) => ({
    x: padding + (i * (chartWidth - padding * 2)) / (weeklyStats.length - 1),
    y: chartHeight - padding - (d.visitors / (maxValue * 1.2)) * (chartHeight - padding * 2),
  }))

  const areaPath = `M${pvPoints.map((p) => `${p.x},${p.y}`).join(' L')} L${pvPoints[pvPoints.length - 1].x},${chartHeight - padding} L${pvPoints[0].x},${chartHeight - padding} Z`
  const pvLinePath = `M${pvPoints.map((p) => `${p.x},${p.y}`).join(' L')}`
  const vLinePath = `M${vPoints.map((p) => `${p.x},${p.y}`).join(' L')}`

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">대시보드</h1>

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="오늘 방문자" value={`${(todayStat?.visitors ?? 0).toLocaleString()}명`} />
        <StatCard title="오늘 페이지뷰" value={`${(todayStat?.page_views ?? 0).toLocaleString()}`} />
        <StatCard title="7일 방문자" value={`${total7.visitors.toLocaleString()}명`} />
        <StatCard title="30일 방문자" value={`${total30.visitors.toLocaleString()}명`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 방문자 차트 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">최근 7일 방문 추이</h2>

          <div className="mb-3 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-300" />
              <span className="text-xs text-zinc-500">페이지뷰</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-xs text-zinc-500">방문자</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full">
            {/* Y축 가이드라인 */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - padding - ratio * (chartHeight - padding * 2)
              const value = Math.round(maxValue * 1.2 * ratio)
              return (
                <g key={ratio}>
                  <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                  <text x={padding - 5} y={y + 4} textAnchor="end" className="fill-zinc-400" fontSize="10">
                    {value.toLocaleString()}
                  </text>
                </g>
              )
            })}

            {/* 영역 채우기 */}
            <path d={areaPath} fill="url(#areaGradient)" opacity="0.6" />
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* 페이지뷰 라인 */}
            <path d={pvLinePath} fill="none" stroke="#93c5fd" strokeWidth="2" />
            {pvPoints.map((p, i) => (
              <circle key={`pv-${i}`} cx={p.x} cy={p.y} r="3" fill="#93c5fd" stroke="white" strokeWidth="1.5" />
            ))}

            {/* 방문자 라인 */}
            <path d={vLinePath} fill="none" stroke="#2563eb" strokeWidth="2" />
            {vPoints.map((p, i) => (
              <circle key={`v-${i}`} cx={p.x} cy={p.y} r="3" fill="#2563eb" stroke="white" strokeWidth="1.5" />
            ))}

            {/* X축 날짜 */}
            {weeklyStats.map((d, i) => (
              <text
                key={d.date}
                x={pvPoints[i].x}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-zinc-400"
                fontSize="10"
              >
                {d.date.slice(5)}
              </text>
            ))}
          </svg>
        </div>

        {/* 기간별 분석 테이블 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">기간별 분석</h2>

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
                {[...weeklyStats].reverse().map((d) => (
                  <tr key={d.date} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="py-2 text-zinc-700">{d.date}</td>
                    <td className="py-2 text-right text-zinc-700">{d.visitors.toLocaleString()}</td>
                    <td className="py-2 text-right text-zinc-700">{d.page_views.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-b border-zinc-100 bg-zinc-50 font-medium">
                  <td className="py-2 text-zinc-900">최근 7일 합계</td>
                  <td className="py-2 text-right text-zinc-900">{total7.visitors.toLocaleString()}명</td>
                  <td className="py-2 text-right text-zinc-900">{total7.page_views.toLocaleString()}</td>
                </tr>
                <tr className="bg-zinc-50 font-medium">
                  <td className="py-2 text-zinc-900">최근 30일 합계</td>
                  <td className="py-2 text-right text-zinc-900">{total30.visitors.toLocaleString()}명</td>
                  <td className="py-2 text-right text-zinc-900">{total30.page_views.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  )
}
