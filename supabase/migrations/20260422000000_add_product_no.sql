ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_no SERIAL;

CREATE INDEX IF NOT EXISTS idx_products_product_no ON public.products(product_no);
