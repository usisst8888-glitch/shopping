-- 주문 테이블
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 사람이 읽을 수 있는 주문번호 (예: 20260530-0001)
  order_no TEXT NOT NULL UNIQUE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 진행 상태
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', -- 결제대기 (입금 대기)
      'paid',            -- 입금확인
      'preparing',       -- 배송준비
      'shipping',        -- 배송중
      'delivered',       -- 배송완료
      'cancelled'        -- 취소
    )),

  -- 주문자 정보 스냅샷
  orderer_name TEXT NOT NULL,
  orderer_phone TEXT NOT NULL,
  orderer_email TEXT NOT NULL,

  -- 배송지 정보 스냅샷
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  postal_code TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  delivery_memo TEXT,

  -- 개인통관고유부호 (해외배송)
  customs_clearance_no TEXT,

  -- 금액 (원 단위)
  subtotal INT NOT NULL DEFAULT 0,
  shipping_fee INT NOT NULL DEFAULT 0,
  points_used INT NOT NULL DEFAULT 0,
  total_amount INT NOT NULL DEFAULT 0,
  points_earned INT NOT NULL DEFAULT 0,

  -- 결제수단
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer')),
  payment_completed_at TIMESTAMPTZ,

  -- 관리자 메모
  admin_memo TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_site_status ON public.orders(site_id, status, created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 본인 주문 조회 (또는 관리자)
CREATE POLICY "주문 조회" ON public.orders FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- 본인 주문 생성
CREATE POLICY "주문 생성" ON public.orders FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
-- 관리자만 수정/삭제 (상태 변경, 메모 등)
CREATE POLICY "주문 관리" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "주문 삭제" ON public.orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
