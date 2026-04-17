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

  const footerPhone =
    (formData.get('footer_phone') as string)?.trim() || null
  const footerHours =
    (formData.get('footer_hours') as string)?.trim() || null
  const footerLunch =
    (formData.get('footer_lunch') as string)?.trim() || null

  let navItems: NavItem[] = []
  try {
    navItems = JSON.parse(formData.get('nav_items') as string || '[]')
  } catch {
    navItems = []
  }

  let brandsList: string[] = []
  try {
    brandsList = JSON.parse(formData.get('brands_list') as string || '[]')
  } catch {
    brandsList = []
  }

  const upsertData: Record<string, unknown> = {
    site_id: siteId,
    hero_title: heroTitle,
    hero_subtitle: heroSubtitle,
    hero_cta_text: heroCtaText,
    hero_cta_link: heroCtaLink,
    hero_bg_color: heroBgColor,
    nav_items: navItems,
    footer_phone: footerPhone,
    footer_hours: footerHours,
    footer_lunch: footerLunch,
    brands_list: brandsList,
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
  return { success: true }
}

// ── 레이아웃 관리 ──

export async function saveLayout(siteId: string, layout: LayoutSection[]) {
  const supabase = await createClient()

  const { error } = await supabase.from('site_design').upsert(
    {
      site_id: siteId,
      homepage_layout: layout,
    },
    { onConflict: 'site_id' }
  )

  if (error) {
    return { error: '레이아웃 저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/design')
  revalidatePath('/')
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
