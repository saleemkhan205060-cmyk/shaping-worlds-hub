ALTER TABLE public.market_products ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Market products are viewable by everyone" ON public.market_products;

CREATE POLICY "Public market products are viewable by everyone"
ON public.market_products
FOR SELECT
USING ((is_private = false) OR (auth.uid() = user_id));