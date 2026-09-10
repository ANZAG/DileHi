
CREATE TABLE public.epoch_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch TEXT NOT NULL DEFAULT 'mittelalter',
  text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.epoch_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can read epoch_sources"
  ON public.epoch_sources FOR SELECT
  USING (true);

-- Only vorstand/herold can insert
CREATE POLICY "Vorstand/Herold can insert epoch_sources"
  ON public.epoch_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_vorstand(auth.uid()) OR public.is_herold(auth.uid())
  );

-- Only vorstand/herold can update
CREATE POLICY "Vorstand/Herold can update epoch_sources"
  ON public.epoch_sources FOR UPDATE
  TO authenticated
  USING (
    public.is_vorstand(auth.uid()) OR public.is_herold(auth.uid())
  );

-- Only vorstand/herold can delete
CREATE POLICY "Vorstand/Herold can delete epoch_sources"
  ON public.epoch_sources FOR DELETE
  TO authenticated
  USING (
    public.is_vorstand(auth.uid()) OR public.is_herold(auth.uid())
  );
