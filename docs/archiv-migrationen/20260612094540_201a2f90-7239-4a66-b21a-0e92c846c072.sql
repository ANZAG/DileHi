DROP POLICY IF EXISTS "Anyone can submit application" ON public.membership_applications;
REVOKE INSERT ON public.membership_applications FROM anon;