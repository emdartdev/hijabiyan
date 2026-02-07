-- Seed data
INSERT INTO public.coupons (code, discount_flat_bdt, min_order_bdt, is_active)
VALUES 
('SAVE50', 50, 0, true),
('SAVE200', 200, 0, true)
ON CONFLICT (code) DO UPDATE 
SET discount_flat_bdt = EXCLUDED.discount_flat_bdt, 
    is_active = true;

UPDATE public.products SET price_tiers = '[]'::jsonb WHERE price_tiers IS NULL OR price_tiers = 'null'::jsonb;
