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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, message: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json(500, { ok: false, message: "Server misconfigured" });
  const admin = createClient(supabaseUrl, serviceRole);

  let body: { trackingCode: string; phone: string };
  try {
    body = (await req.json()) as any;
  } catch {
    return json(400, { ok: false, message: "Invalid JSON" });
  }

  const trackingCode = String(body.trackingCode ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!trackingCode || trackingCode.length > 32) return json(400, { ok: false, message: "Invalid tracking code" });
  if (!phone || phone.length > 30) return json(400, { ok: false, message: "Invalid phone" });

  const { data: order, error } = await admin
    .from("orders")
    .select("id, tracking_code, status, delivery_status, created_at")
    .eq("tracking_code", trackingCode)
    .eq("customer_phone", phone)
    .maybeSingle();

  if (error) return json(500, { ok: false, message: "Failed" });
  if (!order) return json(404, { ok: false, message: "অর্ডার পাওয়া যায়নি। কোড ও ফোন নম্বর মিলছে না।" });

  const { data: items } = await admin
    .from("order_items")
    .select("title_bn, qty")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return json(200, {
    ok: true,
    order: {
      trackingCode: order.tracking_code,
      status: order.status,
      deliveryStatus: order.delivery_status,
      createdAt: order.created_at,
      items: (items ?? []).map((it) => ({ titleBn: it.title_bn, qty: it.qty })),
    },
  });
});
