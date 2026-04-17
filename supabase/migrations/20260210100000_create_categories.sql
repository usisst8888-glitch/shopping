-- 카테고리 테이블 (1차~4차 계층 구조)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 카테고리 조회 가능
CREATE POLICY "카테고리 조회" ON public.categories
  FOR SELECT USING (true);

-- admin만 카테고리 관리 가능
CREATE POLICY "카테고리 관리" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
