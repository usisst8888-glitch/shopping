import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageTracker } from '@/components/layout/page-tracker'
import { getSiteConfigFull } from '@/lib/site'
import { trackPageView } from '@/lib/track'
import { after } from 'next/server'

export default async function MallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const site = await getSiteConfigFull()

  // 렌더링 완료 후 비동기로 추적 (응답 속도에 영향 없음)
  after(() => {
    trackPageView(site.id).catch(() => {})
  })

  return (
    <>
      <Header siteName={site.name} navItems={site.design?.nav_items} logoUrl={site.design?.logo_url} />
      <PageTracker siteId={site.id} />
      <main>{children}</main>
      <Footer
        siteName={site.name}
        description={site.description}
        design={site.design}
      />
    </>
  )
}
