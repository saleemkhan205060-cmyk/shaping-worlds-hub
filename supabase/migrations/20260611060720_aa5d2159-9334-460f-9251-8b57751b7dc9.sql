ALTER TABLE public.market_products
  ADD CONSTRAINT affiliate_url_safe_scheme
  CHECK (
    affiliate_url IS NULL
    OR affiliate_url = ''
    OR affiliate_url ~* '^https?://'
  );