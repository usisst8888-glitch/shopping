-- 찜(좋아요) 테이블
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_product ON public.wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_created ON public.wishlists(user_id, created_at DESC);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 조회: 카운트/존재여부 표시를 위해 모두 허용 (개인을 식별할 수 있는 row만 노출되는 것은 클라이언트가 user_id 필터링)
CREATE POLICY "찜 조회" ON public.wishlists FOR SELECT USING (true);
-- 본인 찜만 추가/삭제
CREATE POLICY "찜 추가" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "찜 삭제" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);
