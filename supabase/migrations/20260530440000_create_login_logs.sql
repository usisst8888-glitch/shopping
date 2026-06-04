-- 로그인 기록 (시각/IP/User-Agent)
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_created
  ON public.login_logs (user_id, created_at DESC);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- 본인 또는 관리자만 조회
CREATE POLICY "로그인 로그 조회" ON public.login_logs FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 본인 로그인 기록만 작성
CREATE POLICY "로그인 로그 생성" ON public.login_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
