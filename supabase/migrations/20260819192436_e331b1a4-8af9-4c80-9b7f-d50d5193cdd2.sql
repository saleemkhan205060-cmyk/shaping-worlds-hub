DROP POLICY IF EXISTS "Like counts visible to visitors" ON public.post_likes;
REVOKE ALL ON public.post_likes FROM anon;

CREATE OR REPLACE VIEW public.post_like_counts AS
  SELECT post_id, count(*)::bigint AS like_count
  FROM public.post_likes
  GROUP BY post_id;

ALTER VIEW public.post_like_counts SET (security_invoker = off);
GRANT SELECT ON public.post_like_counts TO anon, authenticated;