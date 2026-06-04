-- 게시물 공개/비공개 설정 (기본 공개). 비공개면 스토어 게시판에 노출되지 않음
ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;
