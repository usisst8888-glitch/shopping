-- 게시물에 국가(플래그 표시용)와 좋아요 수 추가
ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'KR',
  ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;
