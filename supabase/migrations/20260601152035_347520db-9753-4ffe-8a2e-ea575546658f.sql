ALTER TABLE public.product_reports
  DROP CONSTRAINT IF EXISTS product_reports_product_id_fkey;

ALTER TABLE public.product_reports
  DROP CONSTRAINT IF EXISTS product_reports_unique_report;

ALTER TABLE public.product_reports
  ALTER COLUMN product_id TYPE text USING product_id::text;

ALTER TABLE public.product_reports
  ADD CONSTRAINT product_reports_unique_report UNIQUE (product_id, reporter_id);

DROP INDEX IF EXISTS idx_product_reports_product_id;
CREATE INDEX idx_product_reports_product_id ON public.product_reports (product_id);