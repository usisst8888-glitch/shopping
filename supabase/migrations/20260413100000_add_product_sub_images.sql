-- 상품 서브 이미지 (대표 썸네일 외 추가 이미지들)
ALTER TABLE public.products
  ADD COLUMN sub_images TEXT[] DEFAULT ARRAY[]::TEXT[];
