-- Migration: Robust Product Deletion Fix
-- 1) Ensure order_items can reference null products
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;

-- 2) Re-apply foreign key with ON DELETE SET NULL to ensure it's correct
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'order_items' 
          AND column_name = 'product_id'
          AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 3) Ensure Variants and Images have CASCADE delete
-- Product Images
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'product_images' 
          AND column_name = 'product_id'
          AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Product Variants
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'product_variants' 
          AND column_name = 'product_id'
          AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 4) Drop and recreate the delete_product_safe function
CREATE OR REPLACE FUNCTION public.delete_product_safe(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Explicitly clear references in order_items
    UPDATE public.order_items 
    SET variant_id = NULL 
    WHERE variant_id IN (SELECT id FROM public.product_variants WHERE product_id = p_product_id);

    UPDATE public.order_items 
    SET product_id = NULL 
    WHERE product_id = p_product_id;

    -- Delete the product (images and variants cascade delete)
    DELETE FROM public.products WHERE id = p_product_id;
END;
$$;

-- 5) Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_product_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_safe(UUID) TO service_role;
