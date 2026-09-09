ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_following boolean NOT NULL DEFAULT false;
GRANT SELECT (hide_following) ON public.profiles TO anon, authenticated;
GRANT UPDATE (hide_following) ON public.profiles TO authenticated;