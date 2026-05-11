ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS banner_video_url TEXT;
