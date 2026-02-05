-- Customers master (identified by phone)
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  name text NULL,
  notes text NULL,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: normalize by storing digits-only is ideal, but keep simple for now
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON public.customers (phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Admin-only access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Admins can read customers'
  ) THEN
    CREATE POLICY "Admins can read customers"
    ON public.customers
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Admins can insert customers'
  ) THEN
    CREATE POLICY "Admins can insert customers"
    ON public.customers
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Admins can update customers'
  ) THEN
    CREATE POLICY "Admins can update customers"
    ON public.customers
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Admins can delete customers'
  ) THEN
    CREATE POLICY "Admins can delete customers"
    ON public.customers
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at'
  ) THEN
    CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
