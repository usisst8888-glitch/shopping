ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
