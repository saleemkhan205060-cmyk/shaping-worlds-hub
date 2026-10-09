GRANT UPDATE (content) ON public.messages TO authenticated;

CREATE POLICY "Sender can edit own message" ON public.messages
FOR UPDATE TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.restrict_message_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Message routing fields are immutable after send';
  END IF;

  IF NEW.content IS DISTINCT FROM OLD.content THEN
    IF auth.uid() IS NULL OR auth.uid() <> OLD.sender_id THEN
      RAISE EXCEPTION 'Only the sender may edit message content';
    END IF;
    IF btrim(NEW.content) = '' THEN
      RAISE EXCEPTION 'Message content cannot be empty';
    END IF;
  END IF;

  IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
    IF auth.uid() IS NULL OR auth.uid() <> OLD.recipient_id THEN
      RAISE EXCEPTION 'Only the recipient may update read_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;