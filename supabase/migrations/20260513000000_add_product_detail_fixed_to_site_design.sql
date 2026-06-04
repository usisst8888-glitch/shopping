-- 상품상세 상단/하단 고정 콘텐츠
ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS product_detail_top_html TEXT,
  ADD COLUMN IF NOT EXISTS product_detail_bottom_html TEXT;
