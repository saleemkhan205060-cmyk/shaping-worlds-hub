
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, created_at, updated_at, cover_url, bio, location, website, is_verified) ON public.profiles TO anon, authenticated;

REVOKE SELECT ON public.posts FROM anon, authenticated;
GRANT SELECT (id, user_id, media_url, media_type, caption, category, created_at, updated_at, is_private, text_style, title, thumbnail_url, thumbnail_title, is_hidden, is_pinned) ON public.posts TO anon, authenticated;

REVOKE SELECT ON public.post_comments FROM anon, authenticated;
GRANT SELECT (id, post_id, user_id, content, created_at, is_hidden) ON public.post_comments TO anon, authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.posts TO service_role;
GRANT ALL ON public.post_comments TO service_role;
