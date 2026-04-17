CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  visitors INT NOT NULL DEFAULT 0,
  page_views INT NOT NULL DEFAULT 0,
  UNIQUE(site_id, date)
);

CREATE INDEX idx_daily_stats_site_date ON public.daily_stats(site_id, date);

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "통계 조회" ON public.daily_stats FOR SELECT USING (true);
CREATE POLICY "통계 수정" ON public.daily_stats FOR ALL USING (true);
