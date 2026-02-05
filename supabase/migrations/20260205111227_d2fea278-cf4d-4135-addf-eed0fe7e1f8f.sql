-- Fix: Postgres in Supabase does not support CREATE POLICY IF NOT EXISTS.

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  discount_flat_bdt INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  usage_limit INTEGER NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  min_order_bdt INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_lower_uidx ON public.coupons (lower(code));

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coupons' AND policyname = 'Admins can read coupons'
  ) THEN
    CREATE POLICY "Admins can read coupons"
    ON public.coupons
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coupons' AND policyname = 'Admins can insert coupons'
  ) THEN
    CREATE POLICY "Admins can insert coupons"
    ON public.coupons
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coupons' AND policyname = 'Admins can update coupons'
  ) THEN
    CREATE POLICY "Admins can update coupons"
    ON public.coupons
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coupons' AND policyname = 'Admins can delete coupons'
  ) THEN
    CREATE POLICY "Admins can delete coupons"
    ON public.coupons
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Homepage coupon popup
CREATE TABLE IF NOT EXISTS public.homepage_coupon_popup (
  id TEXT NOT NULL PRIMARY KEY,
  title_bn TEXT NULL,
  body_bn TEXT NULL,
  image_url TEXT NULL,
  link_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_coupon_popup ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'homepage_coupon_popup' AND policyname = 'Public can read active homepage coupon popup'
  ) THEN
    CREATE POLICY "Public can read active homepage coupon popup"
    ON public.homepage_coupon_popup
    FOR SELECT
    USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'homepage_coupon_popup' AND policyname = 'Admins can read homepage coupon popup'
  ) THEN
    CREATE POLICY "Admins can read homepage coupon popup"
    ON public.homepage_coupon_popup
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'homepage_coupon_popup' AND policyname = 'Admins can insert homepage coupon popup'
  ) THEN
    CREATE POLICY "Admins can insert homepage coupon popup"
    ON public.homepage_coupon_popup
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'homepage_coupon_popup' AND policyname = 'Admins can update homepage coupon popup'
  ) THEN
    CREATE POLICY "Admins can update homepage coupon popup"
    ON public.homepage_coupon_popup
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'homepage_coupon_popup' AND policyname = 'Admins can delete homepage coupon popup'
  ) THEN
    CREATE POLICY "Admins can delete homepage coupon popup"
    ON public.homepage_coupon_popup
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

INSERT INTO public.homepage_coupon_popup (id, is_active)
VALUES ('main', false)
ON CONFLICT (id) DO NOTHING;

-- Orders: store applied coupon code
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT NULL;

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_coupons_updated_at') THEN
    CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_homepage_coupon_popup_updated_at') THEN
    CREATE TRIGGER update_homepage_coupon_popup_updated_at
    BEFORE UPDATE ON public.homepage_coupon_popup
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Storage bucket for promo assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-assets', 'promo-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for promo-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read promo assets'
  ) THEN
    CREATE POLICY "Public can read promo assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'promo-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload promo assets'
  ) THEN
    CREATE POLICY "Admins can upload promo assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'promo-assets'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update promo assets'
  ) THEN
    CREATE POLICY "Admins can update promo assets"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'promo-assets'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
      bucket_id = 'promo-assets'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete promo assets'
  ) THEN
    CREATE POLICY "Admins can delete promo assets"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'promo-assets'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;
