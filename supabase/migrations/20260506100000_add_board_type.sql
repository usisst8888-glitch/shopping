ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS board_type TEXT DEFAULT 'list' CHECK (board_type IN ('list', 'gallery', 'webzine'));
