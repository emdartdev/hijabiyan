-- Add delivery assignment + delivery status to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_partner_name text,
  ADD COLUMN IF NOT EXISTS delivery_partner_phone text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_status_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_status_check
      CHECK (delivery_status IN ('pending','assigned','out_for_delivery','delivered'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders (delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);