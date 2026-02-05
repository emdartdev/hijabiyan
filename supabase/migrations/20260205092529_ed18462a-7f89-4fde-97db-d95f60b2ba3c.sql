-- hijabiyan.shop core commerce schema (guest checkout)

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('confirmed', 'packed', 'shipped', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  description_bn TEXT,
  hero_rank INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  title_bn TEXT NOT NULL,
  description_bn TEXT,
  return_policy_bn TEXT,
  delivery_info_bn TEXT,
  price_bdt INT NOT NULL,
  compare_at_price_bdt INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_new_arrival BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 4) Product images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_bn TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- 5) Product variants (color/size)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_bn TEXT,
  size_bn TEXT,
  sku TEXT,
  stock_qty INT NOT NULL DEFAULT 0,
  price_bdt INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);

-- 6) Orders (PII) - access via Edge Functions only
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT NOT NULL UNIQUE,
  status public.order_status NOT NULL DEFAULT 'confirmed',

  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address_bn TEXT NOT NULL,
  notes_bn TEXT,

  subtotal_bdt INT NOT NULL DEFAULT 0,
  delivery_fee_bdt INT NOT NULL DEFAULT 0,
  discount_bdt INT NOT NULL DEFAULT 0,
  total_bdt INT NOT NULL DEFAULT 0,

  payment_method TEXT NOT NULL DEFAULT 'COD',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);

-- 7) Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,

  title_bn TEXT NOT NULL,
  color_bn TEXT,
  size_bn TEXT,
  unit_price_bdt INT NOT NULL,
  qty INT NOT NULL,
  line_total_bdt INT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 8) updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_updated_at') THEN
    CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at') THEN
    CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_variants_updated_at') THEN
    CREATE TRIGGER trg_variants_updated_at
    BEFORE UPDATE ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
    CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 9) RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public catalog read
DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
CREATE POLICY "Public can read active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
ON public.products
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public can read product images" ON public.product_images;
CREATE POLICY "Public can read product images"
ON public.product_images
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public can read active variants" ON public.product_variants;
CREATE POLICY "Public can read active variants"
ON public.product_variants
FOR SELECT
USING (is_active = true);

-- Orders contain PII: deny direct access from client (Edge Functions use service role)
DROP POLICY IF EXISTS "No direct read of orders" ON public.orders;
CREATE POLICY "No direct read of orders"
ON public.orders
FOR SELECT
USING (false);

DROP POLICY IF EXISTS "No direct insert of orders" ON public.orders;
CREATE POLICY "No direct insert of orders"
ON public.orders
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update of orders" ON public.orders;
CREATE POLICY "No direct update of orders"
ON public.orders
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "No direct delete of orders" ON public.orders;
CREATE POLICY "No direct delete of orders"
ON public.orders
FOR DELETE
USING (false);

DROP POLICY IF EXISTS "No direct read of order items" ON public.order_items;
CREATE POLICY "No direct read of order items"
ON public.order_items
FOR SELECT
USING (false);

DROP POLICY IF EXISTS "No direct insert of order items" ON public.order_items;
CREATE POLICY "No direct insert of order items"
ON public.order_items
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update of order items" ON public.order_items;
CREATE POLICY "No direct update of order items"
ON public.order_items
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "No direct delete of order items" ON public.order_items;
CREATE POLICY "No direct delete of order items"
ON public.order_items
FOR DELETE
USING (false);
