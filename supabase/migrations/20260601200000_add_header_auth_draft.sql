-- 헤더 우측 메뉴 편집 시 임시 저장 (저장 전 미리보기용)
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS header_auth_config_draft JSONB;
