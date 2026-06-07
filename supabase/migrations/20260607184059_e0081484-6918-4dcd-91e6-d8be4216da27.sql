-- Upload: users may write only into their own user_id folder
CREATE POLICY "message-media users upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read: only sender or recipient of a message containing this file's path
CREATE POLICY "message-media participants read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-media'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.content = 'mm://' || storage.objects.name
      AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
  )
);

-- Delete: only the uploader (their own folder)
CREATE POLICY "message-media uploader delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);