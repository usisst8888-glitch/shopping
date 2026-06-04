-- 1:1 문의
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','order','product','exchange','refund','etc')),
  subject TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','answered','closed')),

  -- 관련 주문 (선택)
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- 회원에게 비공개 표시할지 (관리자가 분류용 메모)
  is_private BOOLEAN DEFAULT false,

  -- 정렬/정렬용
  last_activity_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_user_activity ON public.inquiries(user_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_site_status_activity ON public.inquiries(site_id, status, last_activity_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "문의 조회" ON public.inquiries FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "문의 생성" ON public.inquiries FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "문의 수정" ON public.inquiries FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "문의 삭제" ON public.inquiries FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
