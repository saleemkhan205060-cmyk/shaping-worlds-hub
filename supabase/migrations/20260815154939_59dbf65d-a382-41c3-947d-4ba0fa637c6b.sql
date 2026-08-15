DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by signed-in users" ON public.follows FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.follows FROM anon;

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes viewable by signed-in users" ON public.post_likes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.post_likes FROM anon;