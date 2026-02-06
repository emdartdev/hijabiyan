-- Add tiered pricing and gift rules support to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_rules JSONB DEFAULT '[]'::jsonb;

-- Update the existing product if it matches the description to test the feature
-- Note: This is a target update for "ডাবল লুপ রেডি হিজাব" if it exists.
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
WHERE title_bn LIKE '%ডাবল লুপ রেডি হিজাব%';
