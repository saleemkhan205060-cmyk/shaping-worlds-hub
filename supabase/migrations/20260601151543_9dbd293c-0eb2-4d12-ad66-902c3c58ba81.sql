CREATE TABLE IF NOT EXISTS public.product_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.market_products(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_reports_reason_check CHECK (reason IN ('spam', 'fake_product', 'adult_content', 'copyright', 'scam_fraud', 'other')),
  CONSTRAINT product_reports_unique_report UNIQUE (product_id, reporter_id)
);

GRANT SELECT, INSERT ON public.product_reports TO authenticated;
GRANT ALL ON public.product_reports TO service_role;

ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own product reports" ON public.product_reports;
CREATE POLICY "Users can view their own product reports"
ON public.product_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create their own product reports" ON public.product_reports;
CREATE POLICY "Users can create their own product reports"
ON public.product_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS idx_product_reports_product_id ON public.product_reports (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reports_reporter_id ON public.product_reports (reporter_id);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view their own blocks"
ON public.user_blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can create their own blocks" ON public.user_blocks;
CREATE POLICY "Users can create their own blocks"
ON public.user_blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete their own blocks"
ON public.user_blocks
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks (blocked_id);