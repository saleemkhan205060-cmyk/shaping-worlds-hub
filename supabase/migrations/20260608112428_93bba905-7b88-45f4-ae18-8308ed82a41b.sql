
DROP TRIGGER IF EXISTS restrict_message_updates_trg ON public.messages;
CREATE TRIGGER restrict_message_updates_trg
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.restrict_message_updates();

DROP POLICY IF EXISTS "message-media uploader update" ON storage.objects;
CREATE POLICY "message-media uploader update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'message-media' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'message-media' AND (storage.foldername(name))[1] = (auth.uid())::text);
