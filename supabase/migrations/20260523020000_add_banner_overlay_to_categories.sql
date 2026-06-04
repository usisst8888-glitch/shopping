-- 카테고리 배너 위 오버레이(HIGH-END 텍스트 + 제작과정/구매후기 버튼) 표시 여부
-- 기본값 true → 기존 동작(항상 표시) 유지
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS banner_show_overlay BOOLEAN NOT NULL DEFAULT true;
