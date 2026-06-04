-- product_no는 정렬용 보조 번호로만 사용하므로 UNIQUE 제약을 제거.
-- 복제 시 원본과 동일한 product_no를 재사용하고, 보조 정렬(created_at DESC)로 원본 바로 위에 표시.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_no_unique;
