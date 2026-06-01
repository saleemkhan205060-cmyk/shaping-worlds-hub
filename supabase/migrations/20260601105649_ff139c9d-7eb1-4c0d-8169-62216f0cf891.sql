GRANT SELECT ON public.market_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_products TO authenticated;
GRANT ALL ON public.market_products TO service_role;