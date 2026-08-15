DROP POLICY IF EXISTS "Marriage profiles are viewable by authenticated users" ON public.marriage_profiles;
CREATE POLICY "Approved marriage profiles viewable by authenticated users"
ON public.marriage_profiles FOR SELECT TO authenticated
USING (status = 'approved' OR auth.uid() = user_id OR private.is_admin());