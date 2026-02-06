-- Apply sample tiered pricing to ALL active products for debugging
UPDATE products 
SET price_tiers = '[
  {"min_qty": 1, "unit_price": 300},
  {"min_qty": 2, "unit_price": 275},
  {"min_qty": 4, "unit_price": 250}
]'::jsonb,
gift_rules = '[
  {"min_qty": 2, "gift_name": "১টা ইনার কেপ ফ্রি"},
  {"min_qty": 4, "gift_name": "২টা ইনার কেপ ফ্রি"}
]'::jsonb
WHERE is_active = true;
