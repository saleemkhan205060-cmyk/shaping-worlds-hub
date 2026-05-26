ALTER TABLE public.posts ALTER COLUMN media_url DROP NOT NULL;

-- Ensure realtime emits full row data for updates/deletes
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- Add posts to realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.posts';
  END IF;
END $$;