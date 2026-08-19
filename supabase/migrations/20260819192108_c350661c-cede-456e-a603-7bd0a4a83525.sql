GRANT SELECT (post_id) ON public.post_likes TO anon;
DROP POLICY IF EXISTS "Like counts visible to visitors" ON public.post_likes;
CREATE POLICY "Like counts visible to visitors" ON public.post_likes FOR SELECT TO anon USING (true);
GRANT ALL ON public.post_likes TO service_role;