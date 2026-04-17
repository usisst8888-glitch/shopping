-- 배너 테이블
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('hero', 'middle', 'bottom')),
  title TEXT,
  subtitle TEXT,
  link_url TEXT,
  link_text TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_banners_site_position ON public.banners(site_id, position, sort_order);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "배너 조회" ON public.banners FOR SELECT USING (true);
CREATE POLICY "배너 관리" ON public.banners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 사이트 디자인 설정 테이블
CREATE TABLE public.site_design (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL UNIQUE REFERENCES public.sites(id) ON DELETE CASCADE,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_cta_text TEXT DEFAULT '쇼핑하기',
  hero_cta_link TEXT DEFAULT '/',
  hero_bg_color TEXT DEFAULT '#18181b',
  nav_items JSONB DEFAULT '[
    {"label":"신상품","href":"/"},
    {"label":"베스트","href":"/"},
    {"label":"브랜드","href":"/"},
    {"label":"카테고리","href":"/"}
  ]'::jsonb,
  footer_phone TEXT,
  footer_hours TEXT,
  footer_lunch TEXT,
  show_categories_section BOOLEAN DEFAULT true,
  show_featured_section BOOLEAN DEFAULT true,
  show_brands_section BOOLEAN DEFAULT true,
  brands_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_design ENABLE ROW LEVEL SECURITY;

CREATE POLICY "디자인 조회" ON public.site_design FOR SELECT USING (true);
CREATE POLICY "디자인 관리" ON public.site_design FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 기존 사이트에 기본 디자인 삽입
INSERT INTO public.site_design (site_id, hero_title, hero_subtitle, footer_phone, footer_hours, footer_lunch)
SELECT id, '최상급 명품 레플리카', '합리적인 가격으로 만나는 프리미엄 품질. 디테일 하나하나에 정성을 담았습니다.', '010-0000-0000', '평일 10:00 - 18:00', '12:00 - 13:00'
FROM public.sites
LIMIT 1;
