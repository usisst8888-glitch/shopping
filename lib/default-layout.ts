import type { Banner, LayoutSection, SiteDesign } from '@/lib/types/design'

export function getDefaultLayout(): LayoutSection[] {
  return [
    {
      id: 'default-hero',
      type: 'banner',
      visible: true,
      label: '히어로 배너',
      display: 'carousel',
      bannerIds: [],
    },
    {
      id: 'default-categories',
      type: 'categories',
      visible: true,
    },
    {
      id: 'default-featured',
      type: 'featured',
      visible: true,
    },
    {
      id: 'default-brands',
      type: 'brands',
      visible: true,
    },
  ]
}

export function resolveLayout(
  design: SiteDesign | null,
  banners: Banner[],
): LayoutSection[] {
  if (design?.homepage_layout && design.homepage_layout.length > 0) {
    return design.homepage_layout
  }

  // 기존 position 기반 배너로 기본 레이아웃 생성 (마이그레이션 호환)
  const heroIds = banners.filter((b) => b.position === 'hero').map((b) => b.id)
  const middleIds = banners
    .filter((b) => b.position === 'middle')
    .map((b) => b.id)
  const bottomIds = banners
    .filter((b) => b.position === 'bottom')
    .map((b) => b.id)

  const sections: LayoutSection[] = [
    {
      id: 'default-hero',
      type: 'banner',
      visible: true,
      label: '히어로 배너',
      display: 'carousel',
      bannerIds: heroIds,
    },
  ]

  if (middleIds.length > 0) {
    sections.push({
      id: 'default-middle',
      type: 'banner',
      visible: true,
      label: '중간 배너',
      display: 'grid',
      bannerIds: middleIds,
    })
  }

  sections.push({
    id: 'default-categories',
    type: 'categories',
    visible: design?.show_categories_section ?? true,
  })

  sections.push({
    id: 'default-featured',
    type: 'featured',
    visible: design?.show_featured_section ?? true,
  })

  if (bottomIds.length > 0) {
    sections.push({
      id: 'default-bottom',
      type: 'banner',
      visible: true,
      label: '하단 배너',
      display: 'grid',
      bannerIds: bottomIds,
    })
  }

  sections.push({
    id: 'default-brands',
    type: 'brands',
    visible: design?.show_brands_section ?? true,
  })

  return sections
}
