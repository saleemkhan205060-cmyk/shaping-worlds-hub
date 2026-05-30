ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Public posts are viewable by everyone"
ON public.posts
FOR SELECT
USING (is_private = false OR auth.uid() = user_id);
