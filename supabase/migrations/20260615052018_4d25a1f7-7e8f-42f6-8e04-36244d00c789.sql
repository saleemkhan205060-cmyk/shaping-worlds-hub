
-- Fix EXPOSED_SENSITIVE_DATA: restrict profile_about SELECT to owner only;
-- expose a sanitized public view that masks email/mobile per privacy flags.
DROP POLICY IF EXISTS "Users view own or public about" ON public.profile_about;

CREATE POLICY "Users view own about"
  ON public.profile_about
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.profile_about_public
WITH (security_invoker = on) AS
SELECT
  user_id,
  user_name,
  gender,
  dob,
  profession,
  education,
  country,
  marital_status,
  languages,
  website,
  CASE WHEN email_private THEN '' ELSE email END AS email,
  email_private,
  CASE WHEN mobile_private THEN '' ELSE mobile END AS mobile,
  mobile_private,
  is_public,
  created_at,
  updated_at
FROM public.profile_about
WHERE is_public = true;

GRANT SELECT ON public.profile_about_public TO authenticated;

-- Fix MISSING_UPDATE_POLICY_ENFORCEMENT: harden the message update trigger so
-- senders cannot mutate content/recipient/sender after insert either.
CREATE OR REPLACE FUNCTION public.restrict_message_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() = OLD.recipient_id AND auth.uid() <> OLD.sender_id THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.id IS DISTINCT FROM OLD.id
    THEN
      RAISE EXCEPTION 'Recipients may only update the read_at column';
    END IF;
    RETURN NEW;
  END IF;

  -- Senders (or anyone else) may never change immutable message fields.
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Message content and routing fields are immutable after send';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS restrict_message_updates_trg ON public.messages;
CREATE TRIGGER restrict_message_updates_trg
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.restrict_message_updates();
