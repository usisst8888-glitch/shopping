-- 게시판 테이블
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "게시판 조회" ON public.boards FOR SELECT USING (true);
CREATE POLICY "게시판 관리" ON public.boards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 게시글 테이블
CREATE TABLE public.board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  author_name TEXT,
  is_notice BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_board_posts_board ON public.board_posts(board_id, created_at DESC);

ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "게시글 조회" ON public.board_posts FOR SELECT USING (true);
CREATE POLICY "게시글 작성" ON public.board_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "게시글 수정" ON public.board_posts FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "게시글 삭제" ON public.board_posts FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
