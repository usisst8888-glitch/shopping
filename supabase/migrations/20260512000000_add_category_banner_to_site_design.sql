-- 카테고리 페이지 공통 배너 설정을 site_design에 추가
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS category_banner_title TEXT,
  ADD COLUMN IF NOT EXISTS category_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS category_banner_video_url TEXT;
