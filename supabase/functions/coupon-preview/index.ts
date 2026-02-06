import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  code?: string | null;
  subtotalBdt?: number | null;
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

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { ok: false, message: "Invalid JSON" });
  }

  const code = String(body.code ?? "").trim();
  const subtotalBdt = Number(body.subtotalBdt ?? 0);
  if (!Number.isFinite(subtotalBdt) || subtotalBdt < 0) return json(400, { ok: false, message: "Invalid subtotal" });

  const { data, error } = await admin.rpc("peek_coupon_discount", {
    _code: code,
    _subtotal_bdt: Math.round(subtotalBdt),
  });

  if (error) return json(500, { ok: false, message: error.message });
  const row = Array.isArray(data) ? data[0] : (data as any);

  return json(200, {
    ok: !!row?.ok,
    message: row?.message ?? "",
    code: row?.code ?? null,
    discountBdt: Number(row?.discount_bdt ?? 0),
  });
});
