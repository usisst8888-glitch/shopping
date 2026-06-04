-- 게시판: 조회수/작성자 표시 여부 (기본 표시)
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS show_view_count BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_author_name BOOLEAN NOT NULL DEFAULT true;
