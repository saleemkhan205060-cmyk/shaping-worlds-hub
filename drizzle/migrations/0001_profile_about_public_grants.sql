REVOKE ALL ON public.profile_about_public FROM anon, authenticated;
GRANT SELECT ON public.profile_about_public TO authenticated;