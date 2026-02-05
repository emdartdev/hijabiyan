-- Coupon helper functions (race-condition safe)

CREATE OR REPLACE FUNCTION public.peek_coupon_discount(
  _code TEXT,
  _subtotal_bdt INTEGER
)
RETURNS TABLE(
  ok BOOLEAN,
  message TEXT,
  code TEXT,
  discount_bdt INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  now_ts TIMESTAMPTZ := now();
BEGIN
  IF _code IS NULL OR btrim(_code) = '' THEN
    RETURN QUERY SELECT false, 'Missing code', NULL::text, 0;
    RETURN;
  END IF;

  SELECT * INTO c
  FROM public.coupons
  WHERE lower(code) = lower(btrim(_code))
  LIMIT 1;

  IF c IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid code', NULL::text, 0;
    RETURN;
  END IF;

  IF NOT c.is_active THEN
    RETURN QUERY SELECT false, 'Coupon inactive', c.code, 0;
    RETURN;
  END IF;

  IF c.start_at IS NOT NULL AND c.start_at > now_ts THEN
    RETURN QUERY SELECT false, 'Coupon not started', c.code, 0;
    RETURN;
  END IF;

  IF c.end_at IS NOT NULL AND c.end_at < now_ts THEN
    RETURN QUERY SELECT false, 'Coupon expired', c.code, 0;
    RETURN;
  END IF;

  IF COALESCE(_subtotal_bdt, 0) < COALESCE(c.min_order_bdt, 0) THEN
    RETURN QUERY SELECT false, 'Minimum order not met', c.code, 0;
    RETURN;
  END IF;

  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN QUERY SELECT false, 'Usage limit reached', c.code, 0;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT true, 'OK', c.code, GREATEST(0, LEAST(COALESCE(c.discount_flat_bdt, 0), COALESCE(_subtotal_bdt, 0)));
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_coupon_discount(
  _code TEXT,
  _subtotal_bdt INTEGER
)
RETURNS TABLE(
  ok BOOLEAN,
  message TEXT,
  code TEXT,
  discount_bdt INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  now_ts TIMESTAMPTZ := now();
BEGIN
  IF _code IS NULL OR btrim(_code) = '' THEN
    RETURN QUERY SELECT true, 'No coupon', NULL::text, 0;
    RETURN;
  END IF;

  SELECT * INTO c
  FROM public.coupons
  WHERE lower(code) = lower(btrim(_code))
  FOR UPDATE;

  IF c IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid code', NULL::text, 0;
    RETURN;
  END IF;

  IF NOT c.is_active THEN
    RETURN QUERY SELECT false, 'Coupon inactive', c.code, 0;
    RETURN;
  END IF;

  IF c.start_at IS NOT NULL AND c.start_at > now_ts THEN
    RETURN QUERY SELECT false, 'Coupon not started', c.code, 0;
    RETURN;
  END IF;

  IF c.end_at IS NOT NULL AND c.end_at < now_ts THEN
    RETURN QUERY SELECT false, 'Coupon expired', c.code, 0;
    RETURN;
  END IF;

  IF COALESCE(_subtotal_bdt, 0) < COALESCE(c.min_order_bdt, 0) THEN
    RETURN QUERY SELECT false, 'Minimum order not met', c.code, 0;
    RETURN;
  END IF;

  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN QUERY SELECT false, 'Usage limit reached', c.code, 0;
    RETURN;
  END IF;

  UPDATE public.coupons
  SET used_count = used_count + 1,
      updated_at = now_ts
  WHERE id = c.id;

  RETURN QUERY
  SELECT true, 'OK', c.code, GREATEST(0, LEAST(COALESCE(c.discount_flat_bdt, 0), COALESCE(_subtotal_bdt, 0)));
END;
$$;

-- Allow anonymous calls from edge functions only (functions are SECURITY DEFINER anyway).
-- We do not add public RLS; tables remain admin-only.
