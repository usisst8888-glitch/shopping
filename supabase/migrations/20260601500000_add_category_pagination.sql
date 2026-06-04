-- 카테고리별 상품 목록 페이징 설정
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS pagination_mode TEXT NOT NULL DEFAULT 'load_more'
    CHECK (pagination_mode IN ('load_more', 'pages')),
  ADD COLUMN IF NOT EXISTS products_per_row INT NOT NULL DEFAULT 4
    CHECK (products_per_row BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS products_rows INT NOT NULL DEFAULT 10
    CHECK (products_rows BETWEEN 1 AND 30);
