-- 1) Roles (Super Admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Lock down direct access; only allow admin to view/manage roles.
DROP POLICY IF EXISTS "Admins can read user roles" ON public.user_roles;
CREATE POLICY "Admins can read user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 2) Product enhancements
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS discount_price_bdt integer,
  ADD COLUMN IF NOT EXISTS care_instructions_bn text,
  ADD COLUMN IF NOT EXISTS delivery_notes_bn text;

-- Helpful uniqueness for SKU if used
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='products_sku_unique'
  ) THEN
    CREATE UNIQUE INDEX products_sku_unique ON public.products (sku) WHERE sku IS NOT NULL;
  END IF;
END $$;

-- Variant enhancements (color swatch + optional image)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS image_url text;


-- 3) Category enhancements (hierarchy + SEO + image)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS seo_title_bn text,
  ADD COLUMN IF NOT EXISTS seo_description_bn text;

-- self FK for parent category
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public'
      AND table_name='categories'
      AND constraint_name='categories_parent_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;


-- 4) Admin CRUD RLS policies for catalog tables
-- Products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Categories
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Variants
DROP POLICY IF EXISTS "Admins can insert variants" ON public.product_variants;
CREATE POLICY "Admins can insert variants"
ON public.product_variants
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update variants" ON public.product_variants;
CREATE POLICY "Admins can update variants"
ON public.product_variants
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete variants" ON public.product_variants;
CREATE POLICY "Admins can delete variants"
ON public.product_variants
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Product images (DB table holding URLs)
DROP POLICY IF EXISTS "Admins can insert product images" ON public.product_images;
CREATE POLICY "Admins can insert product images"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
CREATE POLICY "Admins can update product images"
ON public.product_images
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;
CREATE POLICY "Admins can delete product images"
ON public.product_images
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- 5) Storage bucket for uploaded product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view product images
DROP POLICY IF EXISTS "Public can read product-images" ON storage.objects;
CREATE POLICY "Public can read product-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Admins can upload/update/delete product images
DROP POLICY IF EXISTS "Admins can upload product-images" ON storage.objects;
CREATE POLICY "Admins can upload product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update product-images" ON storage.objects;
CREATE POLICY "Admins can update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete product-images" ON storage.objects;
CREATE POLICY "Admins can delete product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
