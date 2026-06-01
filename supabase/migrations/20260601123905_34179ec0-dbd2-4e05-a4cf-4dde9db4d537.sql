DROP POLICY IF EXISTS "Authenticated users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media metadata" ON storage.objects;

CREATE POLICY "Authenticated users can upload to their media folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'market'
      AND (auth.uid())::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Users can view their own media metadata"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'market'
      AND (auth.uid())::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'market'
      AND (auth.uid())::text = (storage.foldername(name))[2]
    )
  )
)
WITH CHECK (
  bucket_id = 'media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'market'
      AND (auth.uid())::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'market'
      AND (auth.uid())::text = (storage.foldername(name))[2]
    )
  )
);