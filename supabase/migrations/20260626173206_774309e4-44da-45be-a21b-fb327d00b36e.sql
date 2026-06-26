
-- Tighten SECURITY DEFINER function exposure: revoke from PUBLIC/anon, keep authenticated only where needed for RLS
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_message_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restrict_message_updates() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_moderator_or_admin() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator_or_admin() TO authenticated;

-- Replace overly permissive INSERT policy on admin_failed_logins with a constrained check
DROP POLICY IF EXISTS "Anyone insert failed logins" ON public.admin_failed_logins;
CREATE POLICY "Anyone insert failed logins"
  ON public.admin_failed_logins
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND (reason IS NULL OR length(reason) <= 500)
    AND (user_agent IS NULL OR length(user_agent) <= 1000)
  );
