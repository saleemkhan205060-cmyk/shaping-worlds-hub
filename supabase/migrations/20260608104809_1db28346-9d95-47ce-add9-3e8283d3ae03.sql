
CREATE TABLE public.profile_about (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  dob text NOT NULL DEFAULT '',
  profession text NOT NULL DEFAULT '',
  education text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  marital_status text NOT NULL DEFAULT '',
  languages text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  email_private boolean NOT NULL DEFAULT true,
  mobile text NOT NULL DEFAULT '',
  mobile_private boolean NOT NULL DEFAULT true,
  website text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_about TO authenticated;
GRANT ALL ON public.profile_about TO service_role;

ALTER TABLE public.profile_about ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own about"
  ON public.profile_about FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own about"
  ON public.profile_about FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own about"
  ON public.profile_about FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own about"
  ON public.profile_about FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER profile_about_updated_at
  BEFORE UPDATE ON public.profile_about
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
