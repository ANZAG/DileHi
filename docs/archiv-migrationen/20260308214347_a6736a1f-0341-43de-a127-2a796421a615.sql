
-- Vereinsdokumente table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'sonstiges',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view documents" ON public.documents
  FOR SELECT TO authenticated
  USING (is_member(auth.uid()));

CREATE POLICY "Vorstand can insert documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can delete documents" ON public.documents
  FOR DELETE TO authenticated
  USING (is_vorstand(auth.uid()));

-- Beiträge table
CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'offen',
  amount numeric(10,2),
  paid_at date,
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own or treasurer can view contributions" ON public.contributions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_vorstand(auth.uid()) OR is_schatzmeister(auth.uid()));

CREATE POLICY "Treasurer or Vorstand can insert contributions" ON public.contributions
  FOR INSERT TO authenticated
  WITH CHECK (is_vorstand(auth.uid()) OR is_schatzmeister(auth.uid()));

CREATE POLICY "Treasurer or Vorstand can update contributions" ON public.contributions
  FOR UPDATE TO authenticated
  USING (is_vorstand(auth.uid()) OR is_schatzmeister(auth.uid()));

CREATE POLICY "Treasurer or Vorstand can delete contributions" ON public.contributions
  FOR DELETE TO authenticated
  USING (is_vorstand(auth.uid()) OR is_schatzmeister(auth.uid()));

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage RLS
CREATE POLICY "Members can read documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND is_member(auth.uid()));

CREATE POLICY "Vorstand can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND is_vorstand(auth.uid()));
