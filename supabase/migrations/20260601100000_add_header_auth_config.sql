-- 헤더 우측 영역(로그인/회원가입/마이페이지 등) 편집 설정
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS header_auth_config JSONB;
