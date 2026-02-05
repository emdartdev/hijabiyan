-- Migration: Product Deletion Fix v2 (Robust)

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1) Dynamically drop ANY foreign key on order_items that points to products
    -- This handles cases where the constraint name might be different than expected.
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

-- 2) Ensure product_id is nullable
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;

-- 3) Re-add the constraint with SET NULL
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 4) Drop and recreate the delete_product_safe function with even more safety
CREATE OR REPLACE FUNCTION public.delete_product_safe(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Explicitly clear references in order_items just to be absolutely sure
    -- (This shouldn't be needed with ON DELETE SET NULL, but we're being "nuclear")
    
    -- Clear variant references in order_items for variants belonging to this product
    UPDATE public.order_items 
    SET variant_id = NULL 
    WHERE variant_id IN (SELECT id FROM public.product_variants WHERE product_id = p_product_id);

    -- Clear product reference in order_items
    UPDATE public.order_items 
    SET product_id = NULL 
    WHERE product_id = p_product_id;

    -- Now delete the product (images and variants will cascade delete)
    DELETE FROM public.products WHERE id = p_product_id;
END;
$$;

-- 5) Grant execute permission to authenticated users (admins use these)
GRANT EXECUTE ON FUNCTION public.delete_product_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_safe(UUID) TO service_role;
