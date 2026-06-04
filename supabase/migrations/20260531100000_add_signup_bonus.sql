-- 가입 시 자동 지급 포인트
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS signup_bonus_points INT NOT NULL DEFAULT 0;

-- point_history.source 에 signup_bonus 추가
ALTER TABLE public.point_history DROP CONSTRAINT IF EXISTS point_history_source_check;
ALTER TABLE public.point_history ADD CONSTRAINT point_history_source_check
  CHECK (source IN (
    'order_use',
    'order_earn',
    'order_cancel_restore',
    'admin_grant',
    'admin_revoke',
    'signup_bonus'
  ));
