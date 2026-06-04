-- 회원 포인트 잔액
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0 CHECK (points >= 0);
