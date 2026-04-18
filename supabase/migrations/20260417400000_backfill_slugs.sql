-- 기존 상품에 slug 생성 (이름 기반, 공백을 -로 변환)
UPDATE public.products
SET slug = LOWER(REPLACE(TRIM(name), ' ', '-'))
WHERE slug IS NULL;

-- 기존 카테고리에 slug 생성
UPDATE public.categories
SET slug = LOWER(REPLACE(TRIM(name), ' ', '-'))
WHERE slug IS NULL;
