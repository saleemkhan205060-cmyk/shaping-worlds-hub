DROP POLICY IF EXISTS "Media is publicly viewable" ON storage.objects;

CREATE POLICY "Users can view their own media metadata"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);