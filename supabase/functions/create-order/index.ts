import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CreateOrderBody = {
  customerName: string;
  customerPhone: string;
  deliveryAddressBn: string;
  notesBn?: string | null;
  couponCode?: string | null;
  items: { productId: string; variantId?: string | null; qty: number }[];
  deliveryFee: number;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function genTrackingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = (n: number) =>
    Array.from({ length: n })
      .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
      .join("");
  return `HJ-${rand(8)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, message: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json(500, { ok: false, message: "Server misconfigured" });

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: CreateOrderBody;
  try {
    const raw = await req.clone().text();
    console.log("Create order payload:", raw);
    body = JSON.parse(raw);
  } catch (e) {
    return json(400, { ok: false, message: "Invalid JSON" });
  }

  const customerName = String(body.customerName ?? "").trim();
  const customerPhone = String(body.customerPhone ?? "").trim();
  const deliveryAddressBn = String(body.deliveryAddressBn ?? "").trim();
  const notesBn = body.notesBn ? String(body.notesBn).trim().slice(0, 500) : null;
  const couponCode = body.couponCode ? String(body.couponCode).trim().slice(0, 50) : null;
  const items = Array.isArray(body.items) ? body.items : [];
  const deliveryFee = Number(body.deliveryFee);

  if (!customerName || customerName.length > 100) return json(400, { ok: false, message: "Invalid name" });
  if (!customerPhone || customerPhone.length > 30) return json(400, { ok: false, message: "Invalid phone" });
  if (!deliveryAddressBn || deliveryAddressBn.length > 500) return json(400, { ok: false, message: "Invalid address" });
  if (!items.length || items.length > 50) return json(400, { ok: false, message: "Invalid items" });

  // Validate delivery fee against range for flexibility
  if (isNaN(deliveryFee) || deliveryFee < 0 || deliveryFee > 1000) {
    return json(400, { ok: false, message: `Invalid delivery fee: ${deliveryFee}` });
  }

  for (const it of items) {
    const qty = Number(it.qty);
    if (!it.productId || !Number.isFinite(qty) || qty <= 0 || qty > 20) return json(400, { ok: false, message: "Invalid item" });
  }

  // Check if customer is blocked
  const { data: customerRecord, error: customerErr } = await admin
    .from("customers")
    .select("is_blocked")
    .eq("phone", customerPhone)
    .maybeSingle();

  if (customerErr) {
    console.error("Error checking customer block status:", customerErr);
  }

  if (customerRecord?.is_blocked) {
    return json(403, { ok: false, message: "This phone number is blocked from placing orders" });
  }


  const productIds = [...new Set(items.map((it) => it.productId))];
  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id, title_bn, price_bdt, is_active")
    .in("id", productIds);
  if (prodErr) return json(500, { ok: false, message: "Failed to load products" });

  const productMap = new Map((products ?? []).map((p) => [p.id as string, p]));

  const variantIds = [...new Set(items.map((it) => it.variantId).filter(Boolean) as string[])];
  const variantMap = new Map<string, any>();
  if (variantIds.length) {
    const { data: variants, error: varErr } = await admin
      .from("product_variants")
      .select("id, product_id, color_bn, size_bn, stock_qty, price_bdt, is_active")
      .in("id", variantIds);
    if (varErr) return json(500, { ok: false, message: "Failed to load variants" });
    for (const v of variants ?? []) variantMap.set(v.id as string, v);
  }

  const orderLines: any[] = [];
  let subtotal = 0;

  for (const it of items) {
    const prod = productMap.get(it.productId);
    if (!prod || !prod.is_active) return json(400, { ok: false, message: "Product unavailable" });

    let unitPrice = Number(prod.price_bdt);
    let colorBn: string | null = null;
    let sizeBn: string | null = null;
    let variantId: string | null = it.variantId ? String(it.variantId) : null;

    if (variantId) {
      const v = variantMap.get(variantId);
      if (!v || !v.is_active || v.product_id !== prod.id) return json(400, { ok: false, message: "Variant unavailable" });
      colorBn = v.color_bn ?? null;
      sizeBn = v.size_bn ?? null;
      if (v.price_bdt != null) unitPrice = Number(v.price_bdt);
      if (Number(v.stock_qty) < Number(it.qty)) return json(400, { ok: false, message: "Stock not enough" });
    }

    const qty = Number(it.qty);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    orderLines.push({
      product_id: prod.id,
      variant_id: variantId,
      title_bn: prod.title_bn,
      color_bn: colorBn,
      size_bn: sizeBn,
      unit_price_bdt: unitPrice,
      qty,
      line_total_bdt: lineTotal,
    });
  }

  let couponAppliedCode: string | null = null;
  let discount = 0;
  if (couponCode) {
    const { data: discData, error: discErr } = await admin.rpc("redeem_coupon_discount", {
      _code: couponCode,
      _subtotal_bdt: Math.round(subtotal),
    });
    if (discErr) return json(500, { ok: false, message: "Failed to apply coupon" });
    const row = Array.isArray(discData) ? discData[0] : (discData as any);
    if (!row?.ok) return json(400, { ok: false, message: row?.message ?? "Invalid coupon" });
    couponAppliedCode = row?.code ?? couponCode;
    discount = Number(row?.discount_bdt ?? 0);
  }

  const total = Math.max(0, subtotal + deliveryFee - discount);

  let trackingCode = genTrackingCode();
  let orderRow: any | null = null;
  for (let i = 0; i < 5; i++) {
    const { data: inserted, error } = await admin
      .from("orders")
      .insert({
        tracking_code: trackingCode,
        status: "confirmed",
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address_bn: deliveryAddressBn,
        notes_bn: notesBn,
        subtotal_bdt: subtotal,
        delivery_fee_bdt: deliveryFee,
        discount_bdt: discount,
        total_bdt: total,
        payment_method: "COD",
        coupon_code: couponAppliedCode,
      })
      .select("id, tracking_code, status, total_bdt, created_at, customer_phone")
      .maybeSingle();

    if (!error && inserted) {
      orderRow = inserted;
      break;
    }
    trackingCode = genTrackingCode();
  }

  if (!orderRow) return json(500, { ok: false, message: "Failed to create order" });

  const { error: itemsErr } = await admin.from("order_items").insert(orderLines.map((l) => ({ ...l, order_id: orderRow.id })));
  if (itemsErr) {
    await admin.from("orders").delete().eq("id", orderRow.id);
    return json(500, { ok: false, message: "Failed to create order items" });
  }

  // Trigger fraud check asynchronously (don't wait for result if possible, but Edge Functions need wait usually)
  try {
    fetch(`${req.url.split("/create-order")[0]}/fraud-check`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: customerPhone, orderId: orderRow.id }),
    }).catch(e => console.error("Auto fraud check trigger error", e));
  } catch (e) {
    console.error("Async trigger failed", e);
  }

  return json(200, {
    ok: true,
    order: {
      id: orderRow.id,
      trackingCode: orderRow.tracking_code,
      status: orderRow.status,
      totalBdt: orderRow.total_bdt,
      createdAt: orderRow.created_at,
      customerPhone: orderRow.customer_phone,
    },
  });
});
