export type Banner = {
  id: string
  site_id: string
  position: string | null // deprecated, 레이아웃이 배치 담당
  title: string | null
  subtitle: string | null
  link_url: string | null
  link_text: string | null
  image_url: string
  mobile_image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type NavItem = {
  label: string
  href: string
}

// ── 레이아웃 섹션 타입 ──

export type LayoutSectionType = 'banner' | 'categories' | 'featured' | 'brands'

export type LayoutSectionBase = {
  id: string
  type: LayoutSectionType
  visible: boolean
}

export type BannerSectionConfig = LayoutSectionBase & {
  type: 'banner'
  label: string
  display: 'carousel' | 'grid'
  bannerIds: string[]
}

export type CategoriesSectionConfig = LayoutSectionBase & {
  type: 'categories'
}

export type FeaturedSectionConfig = LayoutSectionBase & {
  type: 'featured'
}

export type BrandsSectionConfig = LayoutSectionBase & {
  type: 'brands'
}

export type LayoutSection =
  | BannerSectionConfig
  | CategoriesSectionConfig
  | FeaturedSectionConfig
  | BrandsSectionConfig

export type SiteDesign = {
  id: string
  site_id: string
  logo_url: string | null
  hero_title: string | null
  hero_subtitle: string | null
  hero_cta_text: string
  hero_cta_link: string
  hero_bg_color: string
  nav_items: NavItem[]
  footer_phone: string | null
  footer_hours: string | null
  footer_lunch: string | null
  show_categories_section: boolean
  show_featured_section: boolean
  show_brands_section: boolean
  brands_list: string[]
  homepage_layout: LayoutSection[] | null
  display_category_ids: string[]
  featured_category_id: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  seo_og_image: string | null
  seo_favicon: string | null
  seo_google_verification: string | null
  seo_naver_verification: string | null
  created_at: string
}
