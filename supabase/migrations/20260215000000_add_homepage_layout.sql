-- site_design에 homepage_layout JSONB 컬럼 추가
ALTER TABLE public.site_design
  ADD COLUMN homepage_layout JSONB;

-- banners 테이블에서 position 제약 해제 (레이아웃이 배치 담당)
ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_position_check;

ALTER TABLE public.banners
  ALTER COLUMN position DROP NOT NULL;
