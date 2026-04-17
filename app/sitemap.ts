import { createClient } from '@/lib/supabase/server'
import { getSiteConfig } from '@/lib/site'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getSiteConfig()
  const baseUrl = `https://${site.domain}`

  const supabase = await createClient()

  // 상품 목록
  const { data: products } = await supabase
    .from('products')
    .select('id, slug, updated_at')
    .eq('is_active', true)

  // 카테고리 목록
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug')

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  // 카테고리 페이지
  for (const cat of categories ?? []) {
    entries.push({
      url: `${baseUrl}/category/${cat.slug || cat.id}`,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // 상품 페이지
  for (const product of products ?? []) {
    entries.push({
      url: `${baseUrl}/product/${product.slug || product.id}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
