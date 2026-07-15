
-- Moderation logs: every blocked (or pending-review) upload
CREATE TABLE public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_path text,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  reason text,
  ai_raw jsonb,
  status text NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked','approved','rejected')),
  caption text,
  title text,
  category text,
  is_private boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_logs TO authenticated;
GRANT ALL ON public.moderation_logs TO service_role;

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (public.actor_is_staff(auth.uid()));

CREATE POLICY "Staff can update moderation logs"
  ON public.moderation_logs FOR UPDATE TO authenticated
  USING (public.actor_is_staff(auth.uid()))
  WITH CHECK (public.actor_is_staff(auth.uid()));

CREATE POLICY "Staff can delete moderation logs"
  ON public.moderation_logs FOR DELETE TO authenticated
  USING (public.actor_is_staff(auth.uid()));

CREATE INDEX moderation_logs_status_created_idx
  ON public.moderation_logs (status, created_at DESC);
CREATE INDEX moderation_logs_user_idx
  ON public.moderation_logs (user_id, created_at DESC);

CREATE TRIGGER moderation_logs_updated_at
  BEFORE UPDATE ON public.moderation_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- Editable moderation rules (extra safety guidance appended to the AI prompt)
CREATE TABLE public.moderation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_rules TO authenticated;
GRANT ALL ON public.moderation_rules TO service_role;

ALTER TABLE public.moderation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read enabled rules"
  ON public.moderation_rules FOR SELECT TO authenticated
  USING (enabled OR public.actor_is_staff(auth.uid()));

CREATE POLICY "Staff can manage moderation rules"
  ON public.moderation_rules FOR ALL TO authenticated
  USING (public.actor_is_staff(auth.uid()))
  WITH CHECK (public.actor_is_staff(auth.uid()));

CREATE TRIGGER moderation_rules_updated_at
  BEFORE UPDATE ON public.moderation_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed a couple of default rules so the table isn't empty on first use
INSERT INTO public.moderation_rules (rule, enabled) VALUES
  ('Block screenshots of banking or payment card details', true),
  ('Block QR codes that link to unknown websites', true),
  ('Block obvious spam/watermarked ads for external shops', true);
