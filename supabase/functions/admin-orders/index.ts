import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getQuery(url: string) {
  const u = new URL(url);
  return u.searchParams;
}

async function requireAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return { ok: false as const, status: 500, message: "Server misconfigured" };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const svc = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user?.id) return { ok: false as const, status: 401, message: "Unauthorized" };

  const userId = userData.user.id;
  const { data: roles, error: roleErr } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  if (roleErr) return { ok: false as const, status: 500, message: "Role check failed" };
  if (!(roles ?? []).length) return { ok: false as const, status: 403, message: "Forbidden" };

  return { ok: true as const, svc };
}

function clampStr(v: unknown, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

function isValidDeliveryStatus(v: string) {
  return ["pending", "assigned", "out_for_delivery", "delivered"].includes(v);
}

// order_status is an enum in DB; we still validate to be safe.
function isValidOrderStatus(v: string) {
  return ["confirmed", "packed", "shipped", "delivered", "cancelled"].includes(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const gate = await requireAdmin(req);
  if (!gate.ok) return json(gate.status, { ok: false, message: gate.message });
  const admin = gate.svc;

  // GET list / details
  if (req.method === "GET") {
    const qp = getQuery(req.url);
    const id = clampStr(qp.get("id"), 60);
    const search = clampStr(qp.get("search"), 80);
    const limit = Math.min(Math.max(Number(qp.get("limit") ?? 200) || 200, 1), 500);

    if (id) {
      const { data: order, error: oErr } = await admin
        .from("orders")
        .select(
          "id, tracking_code, customer_name, customer_phone, delivery_address_bn, status, total_bdt, subtotal_bdt, delivery_fee_bdt, discount_bdt, payment_method, notes_bn, created_at, delivery_partner_name, delivery_partner_phone, delivery_status",
        )
        .eq("id", id)
        .maybeSingle();
      if (oErr) return json(500, { ok: false, message: "Failed to load order" });
      if (!order) return json(404, { ok: false, message: "Order not found" });

      const { data: items, error: iErr } = await admin
        .from("order_items")
        .select("id, title_bn, qty, unit_price_bdt, line_total_bdt, size_bn, color_bn")
        .eq("order_id", id)
        .order("created_at", { ascending: true });
      if (iErr) return json(500, { ok: false, message: "Failed to load order items" });

      return json(200, { ok: true, order, items: items ?? [] });
    }

    const base = admin
      .from("orders")
      .select(
        "id, tracking_code, customer_name, customer_phone, status, delivery_status, total_bdt, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    // simple client-side search is okay, but we still narrow by phone if numeric-ish
    // (keeps the implementation simple w/o SQL LIKE edge-cases)
    const { data, error } = await base;
    if (error) return json(500, { ok: false, message: "Failed to load orders" });

    let rows = (data ?? []) as any[];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (o) =>
          String(o.tracking_code ?? "").toLowerCase().includes(q) ||
          String(o.customer_name ?? "").toLowerCase().includes(q) ||
          String(o.customer_phone ?? "").includes(search),
      );
    }

    return json(200, { ok: true, orders: rows });
  }

  // PATCH update order (status/address/notes/delivery assignment)
  if (req.method === "PATCH") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { ok: false, message: "Invalid JSON" });
    }

    const id = clampStr(body?.id, 60);
    if (!id) return json(400, { ok: false, message: "Invalid id" });

    const patch: Record<string, any> = {};

    if (body?.status !== undefined) {
      const s = clampStr(body.status, 30);
      if (!isValidOrderStatus(s)) return json(400, { ok: false, message: "Invalid order status" });
      patch.status = s;
    }

    if (body?.delivery_address_bn !== undefined) {
      const addr = clampStr(body.delivery_address_bn, 500);
      if (!addr) return json(400, { ok: false, message: "Invalid address" });
      patch.delivery_address_bn = addr;
    }

    if (body?.notes_bn !== undefined) {
      const notes = clampStr(body.notes_bn, 500);
      patch.notes_bn = notes ? notes : null;
    }

    if (body?.delivery_partner_name !== undefined) {
      const name = clampStr(body.delivery_partner_name, 80);
      patch.delivery_partner_name = name ? name : null;
    }

    if (body?.delivery_partner_phone !== undefined) {
      const phone = clampStr(body.delivery_partner_phone, 30);
      patch.delivery_partner_phone = phone ? phone : null;
    }

    if (body?.delivery_status !== undefined) {
      const ds = clampStr(body.delivery_status, 30);
      if (!isValidDeliveryStatus(ds)) return json(400, { ok: false, message: "Invalid delivery status" });
      patch.delivery_status = ds;
    }

    if (!Object.keys(patch).length) return json(400, { ok: false, message: "No changes" });

    const { error } = await admin.from("orders").update(patch).eq("id", id);
    if (error) return json(500, { ok: false, message: "Failed to update order" });

    return json(200, { ok: true });
  }

  // DELETE order
  if (req.method === "DELETE") {
    const qp = getQuery(req.url);
    const id = clampStr(qp.get("id"), 60);
    if (!id) return json(400, { ok: false, message: "Invalid id" });

    // order_items will be deleted automatically due to CASCADE in DB schema
    const { error } = await admin.from("orders").delete().eq("id", id);
    if (error) {
      console.error("Delete order error:", error);
      return json(500, { ok: false, message: "Failed to delete order" });
    }

    return json(200, { ok: true });
  }

  return json(405, { ok: false, message: "Method not allowed" });
});
