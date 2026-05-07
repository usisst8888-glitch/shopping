ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS board_categories JSONB DEFAULT '[]'::jsonb;
