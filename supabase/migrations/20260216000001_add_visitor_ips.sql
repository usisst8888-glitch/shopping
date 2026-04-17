ALTER TABLE public.daily_stats ADD COLUMN visitor_ips JSONB DEFAULT '[]'::jsonb;
