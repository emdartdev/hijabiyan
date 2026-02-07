-- Migration: Product Deletion Final Fix
-- Use a unique name to avoid overloading issues (PGRST203)

CREATE OR REPLACE FUNCTION public.delete_product_final(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1) Clear references in order_items
    UPDATE public.order_items 
    SET variant_id = NULL 
    WHERE variant_id IN (SELECT id FROM public.product_variants WHERE product_id = p_product_id);

    UPDATE public.order_items 
    SET product_id = NULL 
    WHERE product_id = p_product_id;

    -- 2) Delete product (variants and images will cascade delete)
    DELETE FROM public.products WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_product_final(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_final(UUID) TO service_role;
