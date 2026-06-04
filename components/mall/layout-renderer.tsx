import type {
  LayoutSection,
  Banner,
  SiteDesign,
  BannerSectionConfig,
  FeaturedSectionConfig,
  CategoriesSectionConfig,
  CardBannerGroupConfig,
  DividerWidgetConfig,
  TextWidgetConfig,
  SpacerWidgetConfig,
  BoardSectionConfig,
} from '@/lib/types/design'
import { HeroBannerCarousel } from './hero-banner-carousel'
import { HeroDefault } from './hero-default'
import { BannerSection } from './banner-section'
import { CategoriesSection } from './categories-section'
import { CardBannerSection } from './card-banner-section'
import { FeaturedSection } from './featured-section'
import { BrandsSection } from './brands-section'
import { BoardFeaturedSection } from './board-featured-section'

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
        const inner = (() => {
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
                    banners={sectionBanners}
                    autoSeconds={cfg.autoSeconds}
                  />
                )
              }
              return <BannerSection banners={sectionBanners} />
            }

            case 'categories': {
              const catCfg = section as CategoriesSectionConfig
              return (
                <CategoriesSection
                  cards={catCfg.cards}
                  label={catCfg.label}
                  subtitle={catCfg.subtitle}
                />
              )
            }

            case 'featured': {
              const cfg = section as FeaturedSectionConfig
              if (!cfg.categoryId) return null
              return (
                <FeaturedSection
                  categoryId={cfg.categoryId}
                  label={cfg.label || '메인상품추출'}
                  subtitle={cfg.subtitle}
                  moreAction={cfg.moreAction || 'link'}
                  showMoreButton={cfg.showMoreButton ?? true}
                  display={cfg.display || 'grid'}
                  perRow={cfg.perRow || 4}
                  rows={cfg.rows || 2}
                  perRowMobile={cfg.perRowMobile ?? 2}
                  rowsMobile={cfg.rowsMobile ?? cfg.rows ?? 2}
                  totalItems={cfg.totalItems}
                  sortBy={cfg.sortBy ?? 'created'}
                  autoSeconds={cfg.autoSeconds || 0}
                />
              )
            }

            case 'cardBannerGroup': {
              const cbCfg = section as CardBannerGroupConfig
              return (
                <CardBannerSection
                  cards={cbCfg.cards}
                  cardHeight={cbCfg.cardHeight}
                />
              )
            }

            case 'brands':
              return <BrandsSection brandsList={design?.brands_list} />

            case 'divider': {
              const cfg = section as DividerWidgetConfig
              const thickness = cfg.thickness ?? 1
              const color = cfg.color ?? '#e4e4e7'
              const my = cfg.marginY ?? 24
              const lineStyle = cfg.style ?? 'solid'
              // 'dashdot' (대시-점 조합) 은 표준 CSS border-style 에 없어서 그라데이션으로 표현
              const isDashDot = lineStyle === 'dashdot'
              return (
                <div className="mx-auto max-w-6xl px-4" style={{ paddingTop: my, paddingBottom: my }}>
                  {isDashDot ? (
                    <div
                      style={{
                        height: thickness,
                        backgroundImage: `repeating-linear-gradient(to right, ${color} 0 10px, transparent 10px 14px, ${color} 14px 16px, transparent 16px 20px)`,
                      }}
                    />
                  ) : (
                    <hr style={{ border: 'none', borderTop: `${thickness}px ${lineStyle} ${color}`, margin: 0 }} />
                  )}
                </div>
              )
            }

            case 'text': {
              const cfg = section as TextWidgetConfig
              const align = cfg.align ?? 'left'
              const my = cfg.marginY ?? 16
              if (!cfg.html?.trim()) return null
              return (
                <div
                  className="mx-auto max-w-6xl px-4"
                  style={{ paddingTop: my, paddingBottom: my, textAlign: align }}
                >
                  <div
                    className="prose prose-sm max-w-none [&_a]:text-blue-600 [&_a:hover]:underline"
                    dangerouslySetInnerHTML={{ __html: cfg.html }}
                  />
                </div>
              )
            }

            case 'spacer': {
              const cfg = section as SpacerWidgetConfig
              const height = cfg.height ?? 40
              return <div style={{ height }} />
            }

            case 'board': {
              const cfg = section as BoardSectionConfig
              if (!cfg.boardId) return null
              return (
                <BoardFeaturedSection
                  boardId={cfg.boardId}
                  label={cfg.label}
                  subtitle={cfg.subtitle}
                  perRow={cfg.perRow ?? 1}
                  rows={cfg.rows ?? 5}
                  showMoreButton={cfg.showMoreButton ?? true}
                  showThumbnail={cfg.showThumbnail ?? true}
                  showDate={cfg.showDate ?? true}
                />
              )
            }

            default:
              return null
          }
        })()

        if (!inner) return null
        // admin 레이아웃 편집기가 iframe 안에서 섹션 좌표를 읽을 수 있도록 마킹.
        // 일반 storefront에는 시각적 영향 없음.
        return (
          <div key={section.id} data-section-id={section.id} data-section-type={section.type}>
            {inner}
          </div>
        )
      })}
    </>
  )
}
