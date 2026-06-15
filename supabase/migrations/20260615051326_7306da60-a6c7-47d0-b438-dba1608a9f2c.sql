ALTER TABLE public.profile_about ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Users view their own about" ON public.profile_about;

CREATE POLICY "Users view own or public about"
  ON public.profile_about FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);