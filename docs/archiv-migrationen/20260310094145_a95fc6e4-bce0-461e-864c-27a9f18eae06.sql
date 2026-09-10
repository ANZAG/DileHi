
CREATE TABLE public.contribution_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  amount numeric NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contribution_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rates" ON public.contribution_rates
  FOR SELECT TO authenticated
  USING (is_member(auth.uid()));

CREATE POLICY "Treasurer or Vorstand can insert rates" ON public.contribution_rates
  FOR INSERT TO authenticated
  WITH CHECK (is_vorstand(auth.uid()) OR is_schatzmeister(auth.uid()));

CREATE POLICY "Treasurer or Vorstand can update rates" ON public.contribution_rates
  FOR UPDATE TO authenticated
  USING (is_vorstand(auth.uid()) OR is_schatzmeister(auth.uid()));

INSERT INTO public.contribution_rates (year, amount) VALUES
  (2022, 30),
  (2023, 30),
  (2024, 30),
  (2025, 30),
  (2026, 36);
