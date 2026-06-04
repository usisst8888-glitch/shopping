ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image TEXT,
  ADD COLUMN IF NOT EXISTS seo_favicon TEXT,
  ADD COLUMN IF NOT EXISTS seo_google_verification TEXT,
  ADD COLUMN IF NOT EXISTS seo_naver_verification TEXT;
