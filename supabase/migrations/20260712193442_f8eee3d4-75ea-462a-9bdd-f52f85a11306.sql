
-- 1. admin_login_history: restrict INSERT to admins only
DROP POLICY IF EXISTS "Users insert own login history" ON public.admin_login_history;
CREATE POLICY "Admins insert own login history" ON public.admin_login_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.is_admin());

-- 2. app_settings: restrict SELECT to admins only (admin UI reads via service-role server fn)
DROP POLICY IF EXISTS "Authenticated read settings" ON public.app_settings;
CREATE POLICY "Admins read settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (private.is_admin());

-- 3. realtime.messages: topic-scoped policies. The app only uses the public
-- "online-users" presence topic; scope broadcast/presence access to that topic.
DROP POLICY IF EXISTS "Authenticated read online-users topic" ON realtime.messages;
CREATE POLICY "Authenticated read online-users topic" ON realtime.messages
  FOR SELECT TO authenticated
  USING (realtime.topic() = 'online-users');

DROP POLICY IF EXISTS "Authenticated write online-users topic" ON realtime.messages;
CREATE POLICY "Authenticated write online-users topic" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (realtime.topic() = 'online-users');
