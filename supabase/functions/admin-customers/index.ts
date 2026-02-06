import { createClient } from "supabase";

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
  if (!supabaseUrl || !anonKey || !serviceRole) return { ok: false as const, status: 500, message: "Server misconfigured" };

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
  const isAdmin = (roles ?? []).length > 0;
  if (!isAdmin) return { ok: false as const, status: 403, message: "Forbidden" };

  return { ok: true as const, svc };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const gate = await requireAdmin(req);
  if (!gate.ok) return json(gate.status, { ok: false, message: gate.message });
  const admin = gate.svc;

  // GET list or profile
  if (req.method === "GET") {
    const qp = getQuery(req.url);
    const phone = (qp.get("phone") ?? "").trim();
    const search = (qp.get("search") ?? "").trim();

    // Single profile
    if (phone) {
      if (phone.length > 30) return json(400, { ok: false, message: "Invalid phone" });

      const { data: customer, error: cErr } = await admin
        .from("customers")
        .select("phone, name, notes, is_blocked")
        .eq("phone", phone)
        .maybeSingle();
      if (cErr) return json(500, { ok: false, message: "Failed to load customer" });

      // Orders summary
      const { data: orders, error: oErr } = await admin
        .from("orders")
        .select("id, tracking_code, status, total_bdt, created_at")
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false })
        .limit(100);
      if (oErr) return json(500, { ok: false, message: "Failed to load orders" });

      const totalOrders = (orders ?? []).length;
      const totalSpent = (orders ?? []).reduce((sum, o: any) => sum + Number(o.total_bdt ?? 0), 0);

      return json(200, {
        ok: true,
        customer: {
          phone,
          name: customer?.name ?? null,
          notes: customer?.notes ?? null,
          is_blocked: customer?.is_blocked ?? false,
          total_orders: totalOrders,
          total_spent_bdt: totalSpent,
          orders: orders ?? [],
        },
      });
    }

    // List customers (prefer customers table; include those who have orders even if not in customers)
    const { data: cRows, error: cErr } = await admin
      .from("customers")
      .select("phone, name, notes, is_blocked")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (cErr) return json(500, { ok: false, message: "Failed to load customers" });

    // Also include phones from orders (in case customer row not created yet)
    const { data: recentOrders, error: oErr } = await admin
      .from("orders")
      .select("customer_phone, customer_name, total_bdt")
      .order("created_at", { ascending: false })
      .limit(500);
    if (oErr) return json(500, { ok: false, message: "Failed to load orders" });

    const byPhone = new Map<string, any>();
    for (const c of cRows ?? []) {
      byPhone.set(c.phone, {
        phone: c.phone,
        name: c.name ?? null,
        notes: c.notes ?? null,
        is_blocked: !!c.is_blocked,
        total_orders: 0,
        total_spent_bdt: 0,
      });
    }
    for (const o of recentOrders ?? []) {
      const p = String((o as any).customer_phone ?? "").trim();
      if (!p) continue;
      if (!byPhone.has(p)) {
        byPhone.set(p, {
          phone: p,
          name: (o as any).customer_name ?? null,
          notes: null,
          is_blocked: false,
          total_orders: 0,
          total_spent_bdt: 0,
        });
      }
      const row = byPhone.get(p);
      row.total_orders += 1;
      row.total_spent_bdt += Number((o as any).total_bdt ?? 0);
    }

    let customers = Array.from(byPhone.values());
    if (search) {
      const s = search.toLowerCase();
      customers = customers.filter((c) => (c.phone ?? "").includes(search) || String(c.name ?? "").toLowerCase().includes(s));
    }

    customers.sort((a, b) => Number(b.total_spent_bdt ?? 0) - Number(a.total_spent_bdt ?? 0));
    customers = customers.slice(0, 300);

    return json(200, { ok: true, customers });
  }

  // PATCH: upsert/update customer info + block/unblock
  if (req.method === "PATCH") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { ok: false, message: "Invalid JSON" });
    }

    const phone = String(body?.phone ?? "").trim();
    if (!phone || phone.length > 30) return json(400, { ok: false, message: "Invalid phone" });

    const name = body?.name === undefined ? undefined : String(body.name ?? "").trim().slice(0, 100) || null;
    const notes = body?.notes === undefined ? undefined : String(body.notes ?? "").trim().slice(0, 500) || null;
    const isBlocked = body?.is_blocked === undefined ? undefined : !!body.is_blocked;

    const patch: any = { phone };
    if (name !== undefined) patch.name = name;
    if (notes !== undefined) patch.notes = notes;
    if (isBlocked !== undefined) patch.is_blocked = isBlocked;

    const { error } = await admin
      .from("customers")
      .upsert(patch, { onConflict: "phone" });
    if (error) return json(500, { ok: false, message: "Failed to update customer" });

    return json(200, { ok: true });
  }

  return json(405, { ok: false, message: "Method not allowed" });
});
