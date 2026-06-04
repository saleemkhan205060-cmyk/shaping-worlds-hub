
-- Restrict marriage_profiles SELECT to authenticated users
DROP POLICY IF EXISTS "Marriage profiles are viewable by everyone" ON public.marriage_profiles;
CREATE POLICY "Marriage profiles are viewable by authenticated users"
  ON public.marriage_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Restrict messages UPDATE to read_at column only
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
