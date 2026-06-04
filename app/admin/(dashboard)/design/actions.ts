'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { uploadToCloudflare } from '@/lib/cloudflare-images'
import type { Banner, SiteDesign, NavItem, LayoutSection } from '@/lib/types/design'

// ── 디자인 설정 ──

export async function getDesign(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_design')
    .select('*')
    .eq('site_id', siteId)
    .single()

  return (data as SiteDesign) ?? null
}

export async function upsertDesign(siteId: string, formData: FormData) {
  const supabase = await createClient()

  // 로고 이미지 업로드
  let logoUrl: string | null | undefined = undefined
  const logoFile = formData.get('logo_image') as File
  if (logoFile && logoFile.size > 0) {
    const logoUpload = await uploadToCloudflare(logoFile)
    if (logoUpload.error) return { error: logoUpload.error }
    logoUrl = logoUpload.url ?? null
  }
  const removeLogo = formData.get('remove_logo') === 'true'
  if (removeLogo) logoUrl = null

  const heroTitle = (formData.get('hero_title') as string)?.trim() || null
  const heroSubtitle =
    (formData.get('hero_subtitle') as string)?.trim() || null
  const heroCtaText =
    (formData.get('hero_cta_text') as string)?.trim() || '쇼핑하기'
  const heroCtaLink =
    (formData.get('hero_cta_link') as string)?.trim() || '/'
  const heroBgColor =
    (formData.get('hero_bg_color') as string)?.trim() || '#18181b'

  const footerHours =
    (formData.get('footer_hours') as string)?.trim() || null
  const footerLunch =
    (formData.get('footer_lunch') as string)?.trim() || null
  const footerExtra =
    (formData.get('footer_extra') as string)?.trim() || null

  const kakaoLink =
    (formData.get('kakao_link') as string)?.trim() || null

  let navItems: NavItem[] = []
  try {
    navItems = JSON.parse(formData.get('nav_items') as string || '[]')
  } catch {
    navItems = []
  }

  // nav_items의 2차 children에 3차 children 자동 채우기
  if (navItems.length > 0) {
    const { data: allCats } = await supabase.from('categories').select('id, name, parent_id').order('sort_order')
    if (allCats) {
      for (const item of navItems) {
        if (item.children) {
          for (const child of item.children) {
            // href에서 카테고리 ID 추출
            const catId = child.href.split('/category/')[1]
            if (catId) {
              const thirds = allCats.filter((c) => c.parent_id === catId)
              if (thirds.length > 0) {
                child.children = thirds.map((t) => ({ label: t.name, href: `/category/${t.id}` }))
              }
            }
          }
        }
      }
    }
  }

  let brandsList: string[] = []
  try {
    brandsList = JSON.parse(formData.get('brands_list') as string || '[]')
  } catch {
    brandsList = []
  }

  let displayCategoryIds: string[] = []
  try {
    displayCategoryIds = JSON.parse(formData.get('display_category_ids') as string || '[]')
  } catch {
    displayCategoryIds = []
  }

  const featuredCategoryId = (formData.get('featured_category_id') as string)?.trim() || null

  const upsertData: Record<string, unknown> = {
    site_id: siteId,
    hero_title: heroTitle,
    hero_subtitle: heroSubtitle,
    hero_cta_text: heroCtaText,
    hero_cta_link: heroCtaLink,
    hero_bg_color: heroBgColor,
    nav_items: navItems,
    footer_phone: null,
    footer_hours: footerHours,
    footer_lunch: footerLunch,
    footer_extra: footerExtra,
    kakao_link: kakaoLink,
    brands_list: brandsList,
    display_category_ids: displayCategoryIds,
    featured_category_id: featuredCategoryId,
  }

  if (logoUrl !== undefined) {
    upsertData.logo_url = logoUrl
  }

  const { error } = await supabase.from('site_design').upsert(
    upsertData,
    { onConflict: 'site_id' }
  )

  if (error) {
    return { error: '디자인 설정 저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
  revalidatePath('/category/[id]', 'page')
  return { success: true }
}

// ── 상품상세 고정 콘텐츠 ──

export async function saveProductDetailFixed(siteId: string, topHtml: string, bottomHtml: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      product_detail_top_html: topHtml || null,
      product_detail_bottom_html: bottomHtml || null,
    },
    { onConflict: 'site_id' }
  )

  if (error) {
    return { error: '저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/product/[id]', 'page')
  return { success: true }
}

// ── 레이아웃 관리 ──

export async function saveLayout(
  siteId: string,
  layout: LayoutSection[],
  headerAuthConfig?: unknown,
  navStyle?: { nav_font_size: number; nav_color: string; nav_hover_color: string },
) {
  const supabase = await createClient()

  // 정식 저장 시 모든 draft 도 함께 비움 (이미 commit 됐으므로)
  const payload: Record<string, unknown> = {
    site_id: siteId,
    homepage_layout: layout,
    homepage_layout_draft: null,
    header_auth_config_draft: null,
    nav_style_draft: null,
  }
  if (headerAuthConfig !== undefined) {
    payload.header_auth_config = headerAuthConfig
  }
  if (navStyle) {
    payload.nav_font_size = navStyle.nav_font_size
    payload.nav_color = navStyle.nav_color
    payload.nav_hover_color = navStyle.nav_hover_color
  }

  const { error } = await supabase.from('site_design').upsert(payload, { onConflict: 'site_id' })

  if (error) {
    return { error: '레이아웃 저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
  return { success: true }
}

// 편집 중 임시 저장 (미리보기용). 정식 저장과 분리하여 "되돌리기" 가능.
export async function saveLayoutDraft(siteId: string, layout: LayoutSection[]) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      homepage_layout_draft: layout,
    },
    { onConflict: 'site_id' }
  )
  if (error) return { error: '임시 저장 중 오류가 발생했습니다.' }
  revalidatePath('/', 'layout')
  return { success: true }
}

// 헤더 우측 인증 영역 설정 — 정식 저장 (commit). draft 도 함께 비움.
export async function saveHeaderAuthConfig(siteId: string, config: unknown) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      header_auth_config: config,
      header_auth_config_draft: null,
    },
    { onConflict: 'site_id' }
  )
  if (error) return { error: '헤더 설정 저장 중 오류가 발생했습니다.' }
  revalidatePath('/admin/design')
  revalidatePath('/', 'layout')
  return { success: true }
}

// 헤더 우측 인증 영역 — 임시 저장 (미리보기 전용)
export async function saveHeaderAuthConfigDraft(siteId: string, config: unknown) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      header_auth_config_draft: config,
    },
    { onConflict: 'site_id' }
  )
  if (error) return { error: '임시 저장 중 오류가 발생했습니다.' }
  revalidatePath('/', 'layout')
  return { success: true }
}

// 헤더 인증 임시 저장 비우기 (되돌리기)
export async function clearHeaderAuthConfigDraft(siteId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      header_auth_config_draft: null,
    },
    { onConflict: 'site_id' }
  )
  if (error) return { error: '되돌리기 중 오류가 발생했습니다.' }
  revalidatePath('/', 'layout')
  return { success: true }
}

// 임시 저장 비우기 (편집 취소/되돌리기) — 모든 draft 컬럼 비움
export async function clearLayoutDraft(siteId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      homepage_layout_draft: null,
      header_auth_config_draft: null,
      nav_style_draft: null,
    },
    { onConflict: 'site_id' }
  )
  if (error) return { error: '되돌리기 중 오류가 발생했습니다.' }
  revalidatePath('/', 'layout')
  return { success: true }
}

// 네비 스타일 — 임시 저장 (미리보기 전용)
export async function saveNavStyleDraft(
  siteId: string,
  navStyle: { nav_font_size: number; nav_color: string; nav_hover_color: string },
) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      nav_style_draft: navStyle,
    },
    { onConflict: 'site_id' }
  )
  if (error) return { error: '임시 저장 중 오류가 발생했습니다.' }
  revalidatePath('/', 'layout')
  return { success: true }
}

// 네비게이션 메뉴 스타일 (폰트 크기 / 글자색 / 호버색) 저장
export async function saveNavStyle(
  siteId: string,
  navStyle: { nav_font_size: number; nav_color: string; nav_hover_color: string }
) {
  const supabase = await createClient()

  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      ...navStyle,
    },
    { onConflict: 'site_id' }
  )

  if (error) {
    return { error: '네비게이션 스타일 저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/', 'layout')
  return { success: true }
}

// ── 배너 관리 ──

export async function getBanners(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('banners')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Banner[]
}

export async function createBanner(formData: FormData) {
  const supabase = await createClient()

  const siteId = formData.get('site_id') as string
  const title = (formData.get('title') as string)?.trim() || null
  const subtitle = (formData.get('subtitle') as string)?.trim() || null
  const linkUrl = (formData.get('link_url') as string)?.trim() || null
  const linkText = (formData.get('link_text') as string)?.trim() || null

  const file = formData.get('image') as File
  if (!file || file.size === 0) {
    return { error: '배너 이미지는 필수입니다.' }
  }

  const upload = await uploadToCloudflare(file)
  if (upload.error) return { error: upload.error }

  let mobileImageUrl: string | null = null
  const mobileFile = formData.get('mobile_image') as File
  if (mobileFile && mobileFile.size > 0) {
    const mobileUpload = await uploadToCloudflare(mobileFile)
    if (mobileUpload.url) mobileImageUrl = mobileUpload.url
  }

  const { count } = await supabase
    .from('banners')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)

  const { error } = await supabase.from('banners').insert({
    site_id: siteId,
    title,
    subtitle,
    link_url: linkUrl,
    link_text: linkText,
    image_url: upload.url,
    mobile_image_url: mobileImageUrl,
    sort_order: count ?? 0,
  })

  if (error) {
    return { error: '배너 등록 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
  return { success: true }
}

export async function updateBanner(id: string, formData: FormData) {
  const supabase = await createClient()

  const title = (formData.get('title') as string)?.trim() || null
  const subtitle = (formData.get('subtitle') as string)?.trim() || null
  const linkUrl = (formData.get('link_url') as string)?.trim() || null
  const linkText = (formData.get('link_text') as string)?.trim() || null

  const updates: Record<string, unknown> = {
    title,
    subtitle,
    link_url: linkUrl,
    link_text: linkText,
  }

  const file = formData.get('image') as File
  if (file && file.size > 0) {
    const upload = await uploadToCloudflare(file)
    if (upload.error) return { error: upload.error }
    updates.image_url = upload.url
  }

  const mobileFile = formData.get('mobile_image') as File
  if (mobileFile && mobileFile.size > 0) {
    const mobileUpload = await uploadToCloudflare(mobileFile)
    if (mobileUpload.url) updates.mobile_image_url = mobileUpload.url
  }

  const { error } = await supabase
    .from('banners')
    .update(updates)
    .eq('id', id)

  if (error) {
    return { error: '배너 수정 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
  return { success: true }
}

export async function deleteBanner(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('banners').delete().eq('id', id)

  if (error) {
    return { error: '배너 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
  return { success: true }
}

export async function toggleBannerActive(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('banners')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    return { error: '배너 상태 변경 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
  return { success: true }
}
