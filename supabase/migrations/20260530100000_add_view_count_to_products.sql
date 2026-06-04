-- 상품 인기순 정렬을 위해 view_count 추가
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_view_count ON public.products(view_count DESC);
