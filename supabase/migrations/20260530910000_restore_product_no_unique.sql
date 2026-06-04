-- product_no UNIQUE 제약 복원 (복제 시 shift 로직과 함께 사용)
-- 1) 같은 product_no가 둘 이상인 행을 정리: created_at 늦은 쪽에 max+rn 부여
WITH dups AS (
  SELECT id, product_no,
    ROW_NUMBER() OVER (PARTITION BY product_no ORDER BY created_at) AS rn
  FROM public.products
  WHERE product_no IS NOT NULL
),
max_no AS (
  SELECT COALESCE(MAX(product_no), 0) AS m FROM public.products
)
UPDATE public.products p
SET product_no = (SELECT m FROM max_no) + d.rn
FROM dups d
WHERE p.id = d.id
  AND d.rn > 1;

-- 2) UNIQUE 제약 추가
ALTER TABLE public.products
  ADD CONSTRAINT products_product_no_unique UNIQUE (product_no);
