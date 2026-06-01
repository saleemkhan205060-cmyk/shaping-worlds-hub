
CREATE TABLE public.market_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  affiliate_url text NOT NULL,
  price numeric(10,2),
  old_price numeric(10,2),
  hashtags text[] DEFAULT '{}'::text[],
  category text DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.market_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_products TO authenticated;
GRANT ALL ON public.market_products TO service_role;

ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market products are viewable by everyone"
  ON public.market_products FOR SELECT USING (true);

CREATE POLICY "Users insert their own market products"
  ON public.market_products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own market products"
  ON public.market_products FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own market products"
  ON public.market_products FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER market_products_updated_at
  BEFORE UPDATE ON public.market_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_market_products_created_at ON public.market_products (created_at DESC);
CREATE INDEX idx_market_products_user ON public.market_products (user_id);
