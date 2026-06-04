-- 무통장입금 계좌 정보
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS shipping_fee INT NOT NULL DEFAULT 5000 CHECK (shipping_fee >= 0),
  ADD COLUMN IF NOT EXISTS free_shipping_threshold INT NOT NULL DEFAULT 0 CHECK (free_shipping_threshold >= 0),
  ADD COLUMN IF NOT EXISTS point_earn_rate INT NOT NULL DEFAULT 2 CHECK (point_earn_rate >= 0),
  ADD COLUMN IF NOT EXISTS point_min_balance INT NOT NULL DEFAULT 5000 CHECK (point_min_balance >= 0),
  ADD COLUMN IF NOT EXISTS point_min_order_amount INT NOT NULL DEFAULT 10000 CHECK (point_min_order_amount >= 0);

COMMENT ON COLUMN public.sites.shipping_fee IS '기본 배송비 (원)';
COMMENT ON COLUMN public.sites.free_shipping_threshold IS '무료배송 기준 금액 (0=비활성)';
COMMENT ON COLUMN public.sites.point_earn_rate IS '구매 시 포인트 적립률 (%)';
COMMENT ON COLUMN public.sites.point_min_balance IS '포인트 사용 가능 최소 보유';
COMMENT ON COLUMN public.sites.point_min_order_amount IS '포인트 사용 가능 최소 주문금액';
