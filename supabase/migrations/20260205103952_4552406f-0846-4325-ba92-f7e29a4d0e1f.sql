-- Add product status + product-level stock
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Keep status values constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_status_allowed'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_allowed
      CHECK (status IN ('active','draft','out_of_stock'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
