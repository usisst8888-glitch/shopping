-- 플로팅 카카오톡 상담 링크 설정을 site_design에 추가
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS kakao_link TEXT;
