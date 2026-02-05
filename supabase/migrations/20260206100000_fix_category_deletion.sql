-- Migration: allow category deletion by setting products.category_id to NULL
-- 1) Make category_id nullable
ALTER TABLE public.products ALTER COLUMN category_id DROP NOT NULL;

-- 2) Update foreign key constraint
-- First, find the constraint name. From previous migrations, it's likely automatic, 
-- but we'll drop it if it exists and recreate it.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
