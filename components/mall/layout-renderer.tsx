import type { LayoutSection, Banner, SiteDesign, BannerSectionConfig } from '@/lib/types/design'
import { HeroBannerCarousel } from './hero-banner-carousel'
import { HeroDefault } from './hero-default'
import { BannerSection } from './banner-section'
import { CategoriesSection } from './categories-section'
import { FeaturedSection } from './featured-section'
import { CategoryProductsSection } from './category-products-section'
import { BrandsSection } from './brands-section'

export function LayoutRenderer({
  layout,
  banners,
  design,
  siteName,
  description,
}: {
  layout: LayoutSection[]
  banners: Banner[]
  design: SiteDesign | null
  siteName: string
  description: string | null
}) {
  const bannerMap = new Map(banners.map((b) => [b.id, b]))

  const visibleSections = layout.filter((s) => s.visible)
  const firstBannerSectionId = visibleSections.find(
    (s) => s.type === 'banner',
  )?.id

  return (
    <>
      {visibleSections.map((section) => {
        switch (section.type) {
          case 'banner': {
            const cfg = section as BannerSectionConfig
            const sectionBanners = cfg.bannerIds
              .map((id) => bannerMap.get(id))
              .filter((b): b is Banner => b != null && b.is_active)

            if (sectionBanners.length === 0) {
              if (section.id === firstBannerSectionId) {
                return (
                  <HeroDefault
                    key={section.id}
                    design={design}
                    siteName={siteName}
                    description={description}
                  />
                )
              }
              return null
            }

            if (cfg.display === 'carousel') {
              return (
                <HeroBannerCarousel
                  key={section.id}
                  banners={sectionBanners}
                />
              )
            }
            return (
              <BannerSection key={section.id} banners={sectionBanners} />
            )
          }

          case 'categories':
            return (
              <CategoriesSection
                key={section.id}
                categoryIds={design?.display_category_ids}
              />
            )

          case 'featured':
            return design?.display_category_ids && design.display_category_ids.length > 0 ? (
              <CategoryProductsSection
                key={section.id}
                categoryIds={design.display_category_ids}
              />
            ) : (
              <FeaturedSection
                key={section.id}
                categoryId={design?.featured_category_id}
              />
            )

          case 'brands':
            return (
              <BrandsSection
                key={section.id}
                brandsList={design?.brands_list}
              />
            )

          default:
            return null
        }
      })}
    </>
  )
}
