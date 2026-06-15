CREATE TABLE public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own shares" ON public.post_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shares" ON public.post_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Shares are viewable by all authenticated users" ON public.post_shares FOR SELECT TO authenticated USING (true);