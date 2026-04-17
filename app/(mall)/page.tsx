import { getSiteConfigFull } from '@/lib/site'
import { LayoutRenderer } from '@/components/mall/layout-renderer'

export default async function HomePage() {
  const site = await getSiteConfigFull()

  return (
    <LayoutRenderer
      layout={site.layout}
      banners={site.banners}
      design={site.design}
      siteName={site.name}
      description={site.description}
    />
  )
}
