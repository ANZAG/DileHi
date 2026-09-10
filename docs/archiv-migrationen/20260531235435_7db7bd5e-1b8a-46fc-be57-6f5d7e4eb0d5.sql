CREATE OR REPLACE FUNCTION public.is_vorstand(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('vorstand', 'officiatus_1', 'officiatus_2')
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('vorstand', 'mitglied', 'herold', 'schatzmeister', 'officiatus_1', 'officiatus_2')
  )
$function$;

CREATE OR REPLACE FUNCTION public.count_members()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT user_id) FROM public.user_roles
  WHERE role::text IN ('vorstand', 'mitglied', 'herold', 'schatzmeister', 'officiatus_1', 'officiatus_2')
$function$;