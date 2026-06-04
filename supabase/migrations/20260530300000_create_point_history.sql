-- 포인트 변동 이력 (트레이서빌리티 + 회원에게 명세 제공)
CREATE TABLE IF NOT EXISTS public.point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 양수 = 적립, 음수 = 차감
  delta INT NOT NULL,
  -- 변동 후 잔액 (감사용)
  balance_after INT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'order_use',           -- 주문 시 사용
    'order_earn',          -- 배송완료 시 적립
    'order_cancel_restore',-- 주문 취소로 복원
    'admin_grant',         -- 관리자 수동 지급
    'admin_revoke'         -- 관리자 수동 회수
  )),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_history_user_created ON public.point_history(user_id, created_at DESC);

ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- 본인 + 관리자 조회
CREATE POLICY "포인트내역 조회" ON public.point_history FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- INSERT: 본인(주문 시) 또는 관리자
CREATE POLICY "포인트내역 생성" ON public.point_history FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
