CREATE TABLE public.page_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  path TEXT NOT NULL,
  visitors INT NOT NULL DEFAULT 0,
  page_views INT NOT NULL DEFAULT 0,
  visitor_ips JSONB DEFAULT '[]'::jsonb,
  UNIQUE(site_id, date, path)
);

CREATE INDEX idx_page_stats_site_date ON public.page_stats(site_id, date);

ALTER TABLE public.page_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "페이지통계 조회" ON public.page_stats FOR SELECT USING (true);
CREATE POLICY "페이지통계 수정" ON public.page_stats FOR ALL USING (true);
