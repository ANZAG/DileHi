
CREATE TABLE public.epoch_visitor_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epoch TEXT NOT NULL DEFAULT 'mittelalter',
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.epoch_visitor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read epoch_visitor_items" ON public.epoch_visitor_items FOR SELECT TO public USING (true);
CREATE POLICY "Vorstand/Herold can insert epoch_visitor_items" ON public.epoch_visitor_items FOR INSERT TO authenticated WITH CHECK (is_vorstand(auth.uid()) OR is_herold(auth.uid()));
CREATE POLICY "Vorstand/Herold can update epoch_visitor_items" ON public.epoch_visitor_items FOR UPDATE TO authenticated USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()));
CREATE POLICY "Vorstand/Herold can delete epoch_visitor_items" ON public.epoch_visitor_items FOR DELETE TO authenticated USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()));
