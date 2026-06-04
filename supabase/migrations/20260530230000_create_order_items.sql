-- 주문 상품 (주문 시점의 정보를 스냅샷으로 보관)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  -- 주문 시점 스냅샷 (상품 정보가 바뀌어도 주문 내역은 보존)
  product_name TEXT NOT NULL,
  product_thumbnail_url TEXT,
  unit_price INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  subtotal INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 본인 주문의 항목 조회 (또는 관리자)
CREATE POLICY "주문항목 조회" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);
-- 본인 주문의 항목 생성
CREATE POLICY "주문항목 생성" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);
-- 관리자만 수정/삭제
CREATE POLICY "주문항목 관리" ON public.order_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "주문항목 삭제" ON public.order_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
