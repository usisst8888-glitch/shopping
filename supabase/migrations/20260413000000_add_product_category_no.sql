-- 상품에 카테고리 번호 컬럼 추가 (선택된 카테고리의 category_no가 저장됨)
ALTER TABLE public.products
  ADD COLUMN category_no TEXT;

CREATE INDEX idx_products_category_no ON public.products(category_no);
