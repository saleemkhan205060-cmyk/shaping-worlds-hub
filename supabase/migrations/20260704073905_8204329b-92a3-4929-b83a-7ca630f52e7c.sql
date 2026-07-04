-- Switch actor_is_staff to SECURITY INVOKER so it's no longer a privileged
-- callable in the exposed API. It's only used with the acting user's own id,
-- and RLS on user_roles lets a user read their own row.
CREATE OR REPLACE FUNCTION public.actor_is_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('admin','moderator')
  );
$function$;

-- Keep it callable by authenticated (triggers still run as the user's role).
REVOKE ALL ON FUNCTION public.actor_is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actor_is_staff(uuid) TO authenticated, service_role;