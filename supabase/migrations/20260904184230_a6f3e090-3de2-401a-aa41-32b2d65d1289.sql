
CREATE OR REPLACE FUNCTION private.media_object_is_public(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE (p.is_private = true OR p.is_hidden = true)
      AND (
        p.media_url LIKE '%/media/' || _name
        OR p.thumbnail_url LIKE '%/media/' || _name
      )
  )
$$;

REVOKE ALL ON FUNCTION private.media_object_is_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.media_object_is_public(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public read access to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read of non-private media" ON storage.objects;
DROP POLICY IF EXISTS "Owners and staff read their media" ON storage.objects;

CREATE POLICY "Public read of non-private media"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'media'
  AND private.media_object_is_public(name)
);

CREATE POLICY "Owners and staff read their media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR ((storage.foldername(name))[1] = 'market' AND (auth.uid())::text = (storage.foldername(name))[2])
    OR private.is_moderator_or_admin()
  )
);
