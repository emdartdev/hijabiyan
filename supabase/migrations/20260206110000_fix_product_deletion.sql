-- Migration: allow product deletion by setting order_items.product_id to NULL
-- 1) Make order_items.product_id nullable
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;

-- 2) Update foreign key constraint on order_items
-- Drop if exists and recreate with ON DELETE SET NULL
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 3) Create delete_product_safe RPC function
CREATE OR REPLACE FUNCTION public.delete_product_safe(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Product images and variants have ON DELETE CASCADE, so we don't need to manually delete them.
  -- order_items now has ON DELETE SET NULL, so we don't need to worry about orders.
  
  DELETE FROM public.products WHERE id = p_product_id;
END;
$$;
