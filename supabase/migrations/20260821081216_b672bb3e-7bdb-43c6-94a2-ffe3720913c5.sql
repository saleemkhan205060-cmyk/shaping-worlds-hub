DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
CREATE POLICY "Public posts are viewable by everyone"
ON public.posts FOR SELECT
USING (
  ((is_private = false) AND (is_hidden IS NOT TRUE))
  OR (auth.uid() = user_id)
  OR private.is_moderator_or_admin()
);

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments are viewable by everyone"
ON public.post_comments FOR SELECT
USING (
  (is_hidden IS NOT TRUE)
  OR (auth.uid() = user_id)
  OR private.is_moderator_or_admin()
);