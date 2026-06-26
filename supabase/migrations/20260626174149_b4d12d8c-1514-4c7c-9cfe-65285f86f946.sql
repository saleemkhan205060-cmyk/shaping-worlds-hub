
-- 1) Private schema for security-definer role helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2) Recreate role helpers in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.has_role(auth.uid(), 'admin') $$;

CREATE OR REPLACE FUNCTION private.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'moderator') $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_moderator_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_moderator_or_admin() TO authenticated, service_role;

-- 3) Recreate all policies referencing the old public.* helpers to use private.*
DROP POLICY IF EXISTS "Admins view activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins view activity logs" ON public.admin_activity_logs FOR SELECT TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Admins insert activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins insert activity logs" ON public.admin_activity_logs FOR INSERT TO authenticated WITH CHECK (private.is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS "Admins view login history" ON public.admin_login_history;
CREATE POLICY "Admins view login history" ON public.admin_login_history FOR SELECT TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Admins view failed logins" ON public.admin_failed_logins;
CREATE POLICY "Admins view failed logins" ON public.admin_failed_logins FOR SELECT TO authenticated USING (private.is_admin());

-- app_settings: restrict reads to authenticated; admins update
DROP POLICY IF EXISTS "Anyone reads settings" ON public.app_settings;
CREATE POLICY "Authenticated read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins update settings" ON public.app_settings;
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Users see relevant notifications" ON public.app_notifications;
CREATE POLICY "Users see relevant notifications" ON public.app_notifications FOR SELECT TO authenticated USING (broadcast = true OR auth.uid() = ANY(target_user_ids) OR private.is_admin());

DROP POLICY IF EXISTS "Admins create notifications" ON public.app_notifications;
CREATE POLICY "Admins create notifications" ON public.app_notifications FOR INSERT TO authenticated WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage all posts" ON public.posts;
CREATE POLICY "Admins manage all posts" ON public.posts FOR ALL TO authenticated USING (private.is_moderator_or_admin()) WITH CHECK (private.is_moderator_or_admin());

DROP POLICY IF EXISTS "Admins manage all comments" ON public.post_comments;
CREATE POLICY "Admins manage all comments" ON public.post_comments FOR ALL TO authenticated USING (private.is_moderator_or_admin()) WITH CHECK (private.is_moderator_or_admin());

DROP POLICY IF EXISTS "Admins view all likes" ON public.post_likes;
CREATE POLICY "Admins view all likes" ON public.post_likes FOR SELECT TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Admins manage post reports" ON public.post_reports;
CREATE POLICY "Admins manage post reports" ON public.post_reports FOR ALL TO authenticated USING (private.is_moderator_or_admin()) WITH CHECK (private.is_moderator_or_admin());

DROP POLICY IF EXISTS "Admins manage product reports" ON public.product_reports;
CREATE POLICY "Admins manage product reports" ON public.product_reports FOR ALL TO authenticated USING (private.is_moderator_or_admin()) WITH CHECK (private.is_moderator_or_admin());

DROP POLICY IF EXISTS "Admins manage marriage profiles" ON public.marriage_profiles;
CREATE POLICY "Admins manage marriage profiles" ON public.marriage_profiles FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins view messages" ON public.messages;
CREATE POLICY "Admins view messages" ON public.messages FOR SELECT TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Admins delete messages" ON public.messages;
CREATE POLICY "Admins delete messages" ON public.messages FOR DELETE TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Admins view push tokens" ON public.push_tokens;
CREATE POLICY "Admins view push tokens" ON public.push_tokens FOR SELECT TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins view/manage message reports" ON public.message_reports;
CREATE POLICY "Admins view/manage message reports" ON public.message_reports FOR ALL TO authenticated USING (private.is_moderator_or_admin()) WITH CHECK (private.is_moderator_or_admin());

-- 4) Drop public.* role helpers (no longer exposed via PostgREST)
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_moderator_or_admin();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
