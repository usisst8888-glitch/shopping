ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'soldout', 'hidden'));

-- 기존 데이터 마이그레이션
UPDATE public.products SET status = 'active' WHERE is_active = true AND status IS NULL;
UPDATE public.products SET status = 'hidden' WHERE is_active = false AND status IS NULL;
