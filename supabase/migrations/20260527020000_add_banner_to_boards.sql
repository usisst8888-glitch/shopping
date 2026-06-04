-- 게시판 상단 배너 (이미지/영상)
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_video_url TEXT;
