DROP VIEW IF EXISTS public.post_like_counts;

CREATE OR REPLACE FUNCTION public.get_post_like_counts(post_ids uuid[])
RETURNS TABLE (post_id uuid, like_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl.post_id, count(*)::bigint
  FROM public.post_likes pl
  WHERE pl.post_id = ANY(post_ids)
  GROUP BY pl.post_id;
$$;

REVOKE ALL ON FUNCTION public.get_post_like_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_like_counts(uuid[]) TO anon, authenticated;