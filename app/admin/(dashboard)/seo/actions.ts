'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { uploadToCloudflare } from '@/lib/cloudflare-images'

export async function getSeoSettings(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_design')
    .select('seo_title, seo_description, seo_keywords, seo_og_image, seo_favicon, seo_google_verification, seo_naver_verification')
    .eq('site_id', siteId)
    .single()

  return data
}

export async function updateSeoSettings(siteId: string, formData: FormData) {
  const supabase = await createClient()

  const seoTitle = (formData.get('seo_title') as string)?.trim() || null
  const seoDescription = (formData.get('seo_description') as string)?.trim() || null
  const seoKeywords = (formData.get('seo_keywords') as string)?.trim() || null
  const seoGoogleVerification = (formData.get('seo_google_verification') as string)?.trim() || null
  const seoNaverVerification = (formData.get('seo_naver_verification') as string)?.trim() || null

  const updates: Record<string, unknown> = {
    site_id: siteId,
    seo_title: seoTitle,
    seo_description: seoDescription,
    seo_keywords: seoKeywords,
    seo_google_verification: seoGoogleVerification,
    seo_naver_verification: seoNaverVerification,
  }

  // OG 이미지 업로드
  const ogFile = formData.get('seo_og_image') as File
  if (ogFile && ogFile.size > 0) {
    const upload = await uploadToCloudflare(ogFile)
    if (upload.error) return { error: upload.error }
    updates.seo_og_image = upload.url
  }
  if (formData.get('remove_og_image') === 'true') {
    updates.seo_og_image = null
  }

  // 파비콘 업로드
  const faviconFile = formData.get('seo_favicon') as File
  if (faviconFile && faviconFile.size > 0) {
    const upload = await uploadToCloudflare(faviconFile)
    if (upload.error) return { error: upload.error }
    updates.seo_favicon = upload.url
  }
  if (formData.get('remove_favicon') === 'true') {
    updates.seo_favicon = null
  }

  const { error } = await supabase
    .from('site_design')
    .upsert(updates, { onConflict: 'site_id' })

  if (error) {
    return { error: 'SEO 설정 저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/seo')
  revalidatePath('/')
  return { success: true }
}
