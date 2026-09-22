DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR (is_banned = false AND is_suspended = false)
  OR private.is_admin()
);

DROP POLICY IF EXISTS "Follows viewable by signed-in users" ON public.follows;
CREATE POLICY "Follows viewable by signed-in users"
ON public.follows FOR SELECT TO authenticated
USING (
  auth.uid() = follower_id
  OR auth.uid() = following_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = follows.follower_id
      AND p.hide_following = false
      AND p.is_banned = false
      AND p.is_suspended = false
  )
  OR private.is_admin()
);