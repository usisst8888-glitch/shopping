-- 상품의 카테고리 번호를 배열로 변경 (여러 카테고리 번호 동시 저장)
ALTER TABLE public.products
  DROP COLUMN IF EXISTS category_no;

ALTER TABLE public.products
  ADD COLUMN category_nos TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX idx_products_category_nos ON public.products USING GIN (category_nos);
