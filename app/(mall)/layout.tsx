import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageTracker } from '@/components/layout/page-tracker'
import { getSiteConfigFull } from '@/lib/site'
import { trackPageView } from '@/lib/track'

export default async function MallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const site = await getSiteConfigFull()

  // 사이트 전체 방문 추적 (렌더링 블로킹 없음)
  trackPageView(site.id).catch(() => {})

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
