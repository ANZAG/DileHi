
CREATE OR REPLACE FUNCTION public.get_current_contribution_rate()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT amount
  FROM public.contribution_rates
  WHERE year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
  ORDER BY year DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_current_contribution_rate() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_current_satzung_path()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT storage_path
  FROM public.documents
  WHERE category = 'satzung'
  ORDER BY created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_current_satzung_path() TO anon, authenticated;
