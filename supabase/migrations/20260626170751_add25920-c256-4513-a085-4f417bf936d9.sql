
-- ============================================================
-- VIP Life Admin Panel — Foundation Migration (additive only)
-- ============================================================

-- 1) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator') $$;

DO $$ BEGIN
  CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Additive columns on existing tables (all nullable / safe defaults)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

ALTER TABLE public.marriage_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.post_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.product_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3) Message reports table (for chat moderation)
CREATE TABLE IF NOT EXISTS public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.message_reports TO authenticated;
GRANT ALL ON public.message_reports TO service_role;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users create message reports" ON public.message_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins view/manage message reports" ON public.message_reports FOR ALL TO authenticated USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Admin activity log
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins view activity logs" ON public.admin_activity_logs FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins insert activity logs" ON public.admin_activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND admin_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Login history + failed logins
CREATE TABLE IF NOT EXISTS public.admin_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_login_history TO authenticated;
GRANT ALL ON public.admin_login_history TO service_role;
ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins view login history" ON public.admin_login_history FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users insert own login history" ON public.admin_login_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.admin_failed_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_failed_logins TO authenticated;
GRANT ALL ON public.admin_failed_logins TO service_role;
ALTER TABLE public.admin_failed_logins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins view failed logins" ON public.admin_failed_logins FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone insert failed logins" ON public.admin_failed_logins FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) App settings (singleton)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name text NOT NULL DEFAULT 'VIP Life',
  logo_url text,
  banner_url text,
  privacy_policy text,
  terms text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  contact_email text,
  contact_phone text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone reads settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7) App notifications (broadcast / targeted)
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_user_ids uuid[],
  broadcast boolean NOT NULL DEFAULT false,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_notifications TO authenticated;
GRANT ALL ON public.app_notifications TO service_role;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see relevant notifications" ON public.app_notifications FOR SELECT TO authenticated USING (broadcast = true OR auth.uid() = ANY(target_user_ids) OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins create notifications" ON public.app_notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8) Admin override policies on existing tables (additive — do not replace existing user policies)
DO $$ BEGIN
  CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage all posts" ON public.posts FOR ALL TO authenticated USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage all comments" ON public.post_comments FOR ALL TO authenticated USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins view all likes" ON public.post_likes FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage post reports" ON public.post_reports FOR ALL TO authenticated USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage product reports" ON public.product_reports FOR ALL TO authenticated USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage marriage profiles" ON public.marriage_profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins view messages" ON public.messages FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins delete messages" ON public.messages FOR DELETE TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins view push tokens" ON public.push_tokens FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9) Bootstrap: grant admin role to the first admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'saleemkhan205060@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
