CREATE POLICY "Public read access to media bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');