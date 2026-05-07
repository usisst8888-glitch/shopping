ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS category TEXT;
