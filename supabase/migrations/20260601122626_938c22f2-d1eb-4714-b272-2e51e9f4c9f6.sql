GRANT SELECT ON public.market_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_products TO authenticated;
GRANT ALL ON public.market_products TO service_role;

DROP POLICY IF EXISTS "Users insert their own market products" ON public.market_products;
CREATE POLICY "Users insert their own market products"
ON public.market_products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own market products" ON public.market_products;
CREATE POLICY "Users update their own market products"
ON public.market_products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their own market products" ON public.market_products;
CREATE POLICY "Users delete their own market products"
ON public.market_products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);