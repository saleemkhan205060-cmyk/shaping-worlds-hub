REVOKE SELECT ON public.profiles FROM anon, authenticated, PUBLIC;

GRANT SELECT (
  id, username, display_name, avatar_url, cover_url, bio, location, website,
  is_verified, created_at, updated_at
) ON public.profiles TO anon, authenticated;