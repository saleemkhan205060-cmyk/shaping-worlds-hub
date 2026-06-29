
-- 1) Columns for auto-flag reasons
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS auto_flag_reason text;
ALTER TABLE public.posts         ADD COLUMN IF NOT EXISTS auto_flag_reason text;
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS auto_flag_reason text;

-- 2) Shared classifier
CREATE OR REPLACE FUNCTION public.classify_risky_text(_t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text := lower(coalesce(_t,''));
BEGIN
  IF s = '' THEN RETURN NULL; END IF;
  -- Celebrity / public-figure impersonation
  IF s ~ '(elon\s*musk|elonmusk|mr\.?\s*beast|mrbeast|cristiano\s*ronaldo|leo\s*messi|messi\s*official|imran\s*khan\s*(official|pti)|narendra\s*modi|bill\s*gates|jeff\s*bezos|mark\s*zuckerberg|donald\s*trump)'
  THEN RETURN 'impersonation'; END IF;
  -- Crypto / investment scam keywords
  IF s ~ '(bitcoin|\bbtc\b|\busdt\b|\beth\b|crypto|forex|binary\s*option|double\s*your\s*money|guaranteed\s*(profit|return)|investment\s*plan|trading\s*signal)'
  THEN RETURN 'scam_keywords'; END IF;
  -- "Contact me on X for Y"
  IF s ~ '(whats\s*app|whatsapp|wa\.me|telegram|t\.me|gmail|contact\s*me|dm\s*me|inbox\s*me).{0,60}(invest|signal|profit|trade|crypto|earn|withdraw|bonus)'
  THEN RETURN 'contact_scam'; END IF;
  -- Suspicious short links / messenger links
  IF s ~ '(bit\.ly|tinyurl\.com|t\.me/|wa\.me/|chat\.whatsapp\.com|cutt\.ly|is\.gd|rebrand\.ly)'
  THEN RETURN 'suspicious_link'; END IF;
  RETURN NULL;
END $$;

-- 3) Helper: is the actor a mod/admin?
CREATE OR REPLACE FUNCTION public.actor_is_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('admin','moderator')
  );
$$;

-- 4) Posts trigger: rate-limit new accounts + auto-flag risky content
CREATE OR REPLACE FUNCTION public.posts_safety_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct_created timestamptz;
  acct_age_h   numeric;
  todays_posts int;
  reason       text;
  combined     text;
BEGIN
  IF public.actor_is_staff(NEW.user_id) THEN RETURN NEW; END IF;

  SELECT created_at INTO acct_created FROM auth.users WHERE id = NEW.user_id;
  acct_age_h := EXTRACT(EPOCH FROM (now() - coalesce(acct_created, now()))) / 3600.0;

  -- New-account daily limit (2 posts / 24h)
  IF acct_age_h < 24 THEN
    SELECT count(*) INTO todays_posts
      FROM public.posts
      WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours';
    IF todays_posts >= 2 THEN
      RAISE EXCEPTION 'New accounts are limited to 2 posts in the first 24 hours. Please try again later.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Risk classification (caption + title)
  combined := coalesce(NEW.caption,'') || ' ' || coalesce(NEW.title,'');
  reason := public.classify_risky_text(combined);
  IF reason IS NOT NULL THEN
    NEW.auto_flag_reason := reason;
    NEW.is_hidden := true;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS posts_safety_guard ON public.posts;
CREATE TRIGGER posts_safety_guard
BEFORE INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_safety_guard();

-- 5) Comments trigger: auto-flag risky comments (no rate limit yet)
CREATE OR REPLACE FUNCTION public.comments_safety_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE reason text;
BEGIN
  IF public.actor_is_staff(NEW.user_id) THEN RETURN NEW; END IF;
  reason := public.classify_risky_text(NEW.content);
  IF reason IS NOT NULL THEN
    NEW.auto_flag_reason := reason;
    NEW.is_hidden := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS comments_safety_guard ON public.post_comments;
CREATE TRIGGER comments_safety_guard
BEFORE INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.comments_safety_guard();

-- 6) Profile trigger: tag suspicious names/bios
CREATE OR REPLACE FUNCTION public.profiles_safety_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE reason text;
BEGIN
  IF public.actor_is_staff(NEW.id) THEN RETURN NEW; END IF;
  reason := public.classify_risky_text(
    coalesce(NEW.display_name,'') || ' ' ||
    coalesce(NEW.username,'') || ' ' ||
    coalesce(NEW.bio,'')
  );
  NEW.auto_flag_reason := reason;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_safety_guard ON public.profiles;
CREATE TRIGGER profiles_safety_guard
BEFORE INSERT OR UPDATE OF display_name, username, bio ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_safety_guard();
