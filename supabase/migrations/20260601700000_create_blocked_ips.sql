-- 차단된 IP 목록 (사이트 접속 자체 차단)
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips (ip);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- 조회/관리는 관리자만. 단 proxy 에서는 service role 로 조회하므로 RLS 우회.
CREATE POLICY "차단IP 관리" ON public.blocked_ips FOR ALL USING (public.is_admin());
