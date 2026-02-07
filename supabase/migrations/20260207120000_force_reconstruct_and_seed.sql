-- Force reconstruction of commerce columns to resolve sync issues
DO $$
BEGIN
    ALTER TABLE public.coupons DROP COLUMN IF EXISTS discount_flat_bdt;
    ALTER TABLE public.coupons ADD COLUMN discount_flat_bdt INTEGER NOT NULL DEFAULT 0;
    
    ALTER TABLE public.products DROP COLUMN IF EXISTS price_tiers;
    ALTER TABLE public.products ADD COLUMN price_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
END $$;

-- Seed coupons
INSERT INTO public.coupons (code, discount_flat_bdt, min_order_bdt, is_active)
VALUES 
('SAVE50', 50, 0, true),
('SAVE200', 200, 0, true)
ON CONFLICT (code) DO UPDATE 
SET discount_flat_bdt = EXCLUDED.discount_flat_bdt, 
    is_active = true;

-- Reset product tiered pricing
UPDATE public.products SET price_tiers = '[]'::jsonb;
