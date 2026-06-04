-- 회원 그룹
CREATE TABLE IF NOT EXISTS public.member_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_groups_sort
  ON public.member_groups (sort_order, created_at);

ALTER TABLE public.member_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "회원 그룹 조회" ON public.member_groups FOR SELECT USING (true);
CREATE POLICY "회원 그룹 관리" ON public.member_groups FOR ALL USING (public.is_admin());

-- 회원 → 그룹 (1:N). 그룹 삭제 시 회원의 group_id는 NULL.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.member_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles (group_id);
