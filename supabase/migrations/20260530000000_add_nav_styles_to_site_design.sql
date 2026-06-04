-- 네비게이션 메뉴 스타일 (폰트 크기, 글자색, 호버색) 을 site_design 에 추가
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS nav_font_size INT DEFAULT 13,
  ADD COLUMN IF NOT EXISTS nav_color TEXT DEFAULT '#484848',
  ADD COLUMN IF NOT EXISTS nav_hover_color TEXT DEFAULT '#18181b';
