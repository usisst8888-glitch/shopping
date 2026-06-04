-- 1:1 문의의 대화 메시지 (사용자/관리자 모두 작성)
CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('user','admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_created
  ON public.inquiry_messages(inquiry_id, created_at);

ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

-- 본인 문의 또는 관리자만 조회/작성
CREATE POLICY "문의메시지 조회" ON public.inquiry_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = inquiry_messages.inquiry_id
      AND (i.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);
CREATE POLICY "문의메시지 생성" ON public.inquiry_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = inquiry_messages.inquiry_id
      AND (
        (i.user_id = auth.uid() AND author_role = 'user' AND author_id = auth.uid())
        OR (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          AND author_role = 'admin' AND author_id = auth.uid()
        )
      )
  )
);
