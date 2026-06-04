-- 사이트 설정 테이블 (멀티 도메인 운영)
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  footer_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사이트 조회" ON public.sites FOR SELECT USING (true);
CREATE POLICY "사이트 관리" ON public.sites FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 기본 사이트 데이터
INSERT INTO public.sites (domain, name, description) VALUES
  ('localhost:3000', 'LUCKYPLE', '명품 레플리카 전문 사이트');
