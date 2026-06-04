-- 게시판 디자인: 제목/내용 색상
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS title_color TEXT NOT NULL DEFAULT '#18181b',
  ADD COLUMN IF NOT EXISTS content_color TEXT NOT NULL DEFAULT '#71717a';
