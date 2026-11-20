CREATE OR REPLACE FUNCTION public.get_public_marriage_profiles(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  photo_url text,
  display_name text,
  age integer,
  gender text,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mp.id,
    COALESCE(NULLIF(BTRIM(mp.marriage_avatar_url), ''), p.avatar_url) AS photo_url,
    COALESCE(NULLIF(BTRIM(p.display_name), ''), 'User') AS display_name,
    mp.age,
    mp.gender,
    NULLIF(BTRIM(mp.country), '') AS country
  FROM public.marriage_profiles mp
  JOIN public.profiles p ON p.id = mp.user_id
  WHERE mp.status = 'approved'
    AND p.is_banned = false
    AND p.is_suspended = false
  ORDER BY mp.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_public_marriage_profiles(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_marriage_profiles(integer) TO anon, authenticated;

REVOKE ALL ON TABLE public.marriage_profiles, public.marriage_photos, public.marriage_interests FROM anon;