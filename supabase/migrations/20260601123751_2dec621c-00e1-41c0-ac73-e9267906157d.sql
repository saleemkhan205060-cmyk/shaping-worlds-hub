ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.market_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_products TO authenticated;
GRANT ALL ON public.market_products TO service_role;

ALTER TABLE public.market_products
  ALTER COLUMN affiliate_url DROP NOT NULL;

DROP POLICY IF EXISTS "Market products are viewable by everyone" ON public.market_products;
DROP POLICY IF EXISTS "Users insert their own market products" ON public.market_products;
DROP POLICY IF EXISTS "Users update their own market products" ON public.market_products;
DROP POLICY IF EXISTS "Users delete their own market products" ON public.market_products;

CREATE POLICY "Market products are viewable by everyone"
ON public.market_products
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users insert their own market products"
ON public.market_products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own market products"
ON public.market_products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own market products"
ON public.market_products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);