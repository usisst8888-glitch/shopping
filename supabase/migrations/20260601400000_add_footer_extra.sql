-- 푸터 추가사항 (리치 텍스트 - HTML)
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS footer_extra TEXT;
