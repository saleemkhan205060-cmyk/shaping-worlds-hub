CREATE TABLE public.marriage_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  photo_path text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0 AND position <= 6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX marriage_photos_user_idx ON public.marriage_photos(user_id, position);

GRANT SELECT, INSERT, DELETE ON public.marriage_photos TO authenticated;
GRANT ALL ON public.marriage_photos TO service_role;
ALTER TABLE public.marriage_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner, admins, or approved profile viewers can see marriage photos"
ON public.marriage_photos FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.actor_is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.marriage_profiles mp WHERE mp.user_id = marriage_photos.user_id AND mp.status = 'approved')
);
CREATE POLICY "Owner can add own marriage photos"
ON public.marriage_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND photo_path LIKE (auth.uid()::text || '/marriage/album/%'));
CREATE POLICY "Owner can delete own marriage photos"
ON public.marriage_photos FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.marriage_photos_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('marriage_photos:' || NEW.user_id::text));
  IF (SELECT count(*) FROM public.marriage_photos WHERE user_id = NEW.user_id) >= 7 THEN
    RAISE EXCEPTION 'Maximum 7 photos allowed in the Marriage album' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.marriage_photos_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER marriage_photos_limit_trg BEFORE INSERT ON public.marriage_photos
FOR EACH ROW EXECUTE FUNCTION public.marriage_photos_limit();