ALTER TABLE public.products
  ADD COLUMN slug TEXT UNIQUE;

ALTER TABLE public.categories
  ADD COLUMN slug TEXT UNIQUE;

CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_categories_slug ON public.categories(slug);
