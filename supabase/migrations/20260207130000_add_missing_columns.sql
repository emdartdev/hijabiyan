-- Ensure commerce columns exist
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_flat_bdt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
