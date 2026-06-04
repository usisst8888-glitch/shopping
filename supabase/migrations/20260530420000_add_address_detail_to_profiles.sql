ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zipcode TEXT,
  ADD COLUMN IF NOT EXISTS address_detail TEXT;
