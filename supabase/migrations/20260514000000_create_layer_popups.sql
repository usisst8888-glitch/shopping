CREATE TABLE IF NOT EXISTS public.layer_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position TEXT DEFAULT 'center',
  width INTEGER DEFAULT 400,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.layer_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active popups" ON public.layer_popups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage popups" ON public.layer_popups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
