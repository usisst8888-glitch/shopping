ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
