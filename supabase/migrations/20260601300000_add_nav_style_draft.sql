-- 헤더 네비 스타일 미리보기용 임시 저장
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS nav_style_draft JSONB;
