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

type BestSellerRow = {
  product_id: string;
  title_bn: string;
  total_qty: number;
  total_revenue: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { ok: false, message: "Method not allowed" });

  const gate = await requireAdmin(req);
  if (!gate.ok) return json(gate.status, { ok: false, message: gate.message });
  const admin = gate.svc;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Today's orders & revenue
    const { data: todayOrders, error: todayErr } = await admin.from("orders").select("total_bdt").gte("created_at", todayStart);
    if (todayErr) throw todayErr;
    const todayCount = todayOrders?.length ?? 0;
    const todayRev = (todayOrders ?? []).reduce((sum, o: any) => sum + Number(o.total_bdt ?? 0), 0);

    // Month revenue
    const { data: monthOrders, error: monthErr } = await admin.from("orders").select("total_bdt").gte("created_at", monthStart);
    if (monthErr) throw monthErr;
    const monthRev = (monthOrders ?? []).reduce((sum, o: any) => sum + Number(o.total_bdt ?? 0), 0);

    // Status counts
    const [{ count: pendingCount, error: pErr }, { count: deliveredCount, error: dErr }, { count: cancelledCount, error: cErr }] = await Promise.all([
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    ]);
    if (pErr) throw pErr;
    if (dErr) throw dErr;
    if (cErr) throw cErr;

    // Low stock (< 5)
    const { count: lowStockCount, error: lowErr } = await admin
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .lt("stock_qty", 5);
    if (lowErr) throw lowErr;

    // Best sellers (top 5) - scan recent rows
    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("product_id, title_bn, qty, line_total_bdt")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (itemsErr) throw itemsErr;

    const grouped = (items ?? []).reduce((acc: Record<string, BestSellerRow>, it: any) => {
      const key = String(it.product_id ?? "");
      if (!key) return acc;
      if (!acc[key]) acc[key] = { product_id: key, title_bn: String(it.title_bn ?? ""), total_qty: 0, total_revenue: 0 };
      acc[key].total_qty += Number(it.qty ?? 0);
      acc[key].total_revenue += Number(it.line_total_bdt ?? 0);
      return acc;
    }, {} as Record<string, BestSellerRow>);

    const bestSellers = Object.values(grouped)
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 5);

    return json(200, {
      ok: true,
      stats: {
        todayOrders: todayCount,
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        pendingOrders: pendingCount ?? 0,
        deliveredOrders: deliveredCount ?? 0,
        cancelledOrders: cancelledCount ?? 0,
        lowStockCount: lowStockCount ?? 0,
      },
      bestSellers,
    });
  } catch (e: any) {
    console.error("admin-dashboard error", e);
    return json(500, { ok: false, message: e?.message ?? "Failed to load dashboard" });
  }
});
