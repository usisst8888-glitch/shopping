-- 카테고리 번호 컬럼 추가 (CATE7, CATE8 등)
ALTER TABLE public.categories
  ADD COLUMN category_no TEXT UNIQUE;
