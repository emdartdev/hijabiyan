-- Add automatic coupons with correct column names
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_flat_bdt INTEGER NOT NULL DEFAULT 0;
/*
INSERT INTO coupons (code, discount_flat_bdt, min_order_bdt, is_active)
VALUES 
('SAVE50', 50, 0, true),
('SAVE200', 200, 0, true)
ON CONFLICT (code) DO UPDATE 
SET discount_flat_bdt = EXCLUDED.discount_flat_bdt, 
    is_active = true;
*/

-- Clear the previously added per-product tiered pricing to avoid confusion/conflict
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
-- UPDATE products SET price_tiers = '[]'::jsonb;
