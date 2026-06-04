-- 기존 상품에 slug 생성 (이름 기반 + id 앞 8자리로 중복 방지)
UPDATE public.products
SET slug = LOWER(REPLACE(TRIM(name), ' ', '-')) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL;

-- 기존 카테고리에 slug 생성
UPDATE public.categories
SET slug = LOWER(REPLACE(TRIM(name), ' ', '-')) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL;
