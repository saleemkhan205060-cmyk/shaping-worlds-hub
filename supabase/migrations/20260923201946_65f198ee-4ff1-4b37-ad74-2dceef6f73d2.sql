CREATE TABLE public.marriage_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_user_id),
  CHECK (user_id <> target_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.marriage_interests TO authenticated;
GRANT ALL ON public.marriage_interests TO service_role;
ALTER TABLE public.marriage_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or received interests" ON public.marriage_interests FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = target_user_id);
CREATE POLICY "Create own interests" ON public.marriage_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own interests" ON public.marriage_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);