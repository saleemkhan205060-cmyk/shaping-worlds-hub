CREATE TABLE public.marriage_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  age integer,
  looking_for text,
  country text,
  profession text,
  marital_status text,
  religion text,
  about text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marriage_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marriage_profiles TO authenticated;
GRANT ALL ON public.marriage_profiles TO service_role;

ALTER TABLE public.marriage_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marriage profiles are viewable by everyone"
  ON public.marriage_profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own marriage profile"
  ON public.marriage_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marriage profile"
  ON public.marriage_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marriage profile"
  ON public.marriage_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER marriage_profiles_updated_at
  BEFORE UPDATE ON public.marriage_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();