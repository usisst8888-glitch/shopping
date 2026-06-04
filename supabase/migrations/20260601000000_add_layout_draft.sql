-- 레이아웃 편집 시 임시 저장 (저장 누르기 전 미리보기용)
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS homepage_layout_draft JSONB;
