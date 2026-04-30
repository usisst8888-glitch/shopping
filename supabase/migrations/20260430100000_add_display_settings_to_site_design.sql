ALTER TABLE public.site_design
  ADD COLUMN IF NOT EXISTS display_category_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_category_id UUID;
