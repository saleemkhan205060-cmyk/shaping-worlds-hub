-- Revoke public execute on SECURITY DEFINER functions.
-- Trigger functions do not need EXECUTE grants for triggers to fire.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef AND n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated;',
                   r.schema, r.name, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role;',
                   r.schema, r.name, r.args);
  END LOOP;
END $$;

-- actor_is_staff is used inside RLS policies (evaluated as the current role),
-- so authenticated users must be able to execute it.
GRANT EXECUTE ON FUNCTION public.actor_is_staff(uuid) TO authenticated;