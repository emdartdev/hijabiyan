import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  phone: string;
  orderId?: string;
  action?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
    
    // Always create admin client for background tasks
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();

      if (userError || !user) {
        return json(401, { error: "Unauthorized" });
      }

      // Verify admin role
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        return json(403, { error: "Forbidden" });
      }
    }

    const { phone, orderId, action } = (await req.json().catch(() => ({}))) as ReqBody;

    if (action === "check-connection") {
      const response = await fetch("https://api.bdcourier.com/check-connection", {
        method: "GET",
        headers: { "Authorization": "Bearer AaBVEFV6e1xu553ksGC8v2t8zJrricEjZNTuFAJqsY8TGDAKDMKk9AkEodT0" },
      });
      const data = await response.json().catch(() => ({ error: "Invalid JSON response" }));
      return json(200, data);
    }

    if (!phone) return json(400, { error: "Phone number is required" });

    const cleanPhone = phone.replace(/\D/g, "");

    // 1. DATA GATHERING
    const results: {
      bd_courier: any;
      steadfast: any;
      internal: any;
      scoring: {
        score: number;
        reasons: string[];
        status: string;
      };
    } = {
      bd_courier: null,
      steadfast: null,
      internal: null,
      scoring: {
        score: 0,
        reasons: [] as string[],
        status: "low",
      },
    };

    // A. BD Courier API
    try {
      const bdRes = await fetch("https://api.bdcourier.com/courier-check", {
        method: "POST",
        headers: {
          "Authorization": "Bearer AaBVEFV6e1xu553ksGC8v2t8zJrricEjZNTuFAJqsY8TGDAKDMKk9AkEodT0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      results.bd_courier = await bdRes.json();
    } catch (e) {
      console.error("BD Courier Error", e);
    }

    // B. Steadfast API
    try {
      const sfRes = await fetch("https://app.courier.com.bd/api/v1/courier-check", {
        method: "POST",
        headers: {
          "Api-Key": "zzndyqe3cx2jak2phukizi9sqpomx3pa",
          "Secret-Key": "m0aqvhva0p1adi3n3ecv53ky",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      results.steadfast = await sfRes.json();
    } catch (e) {
      console.error("Steadfast Error", e);
    }

    // C. Internal Data
    const { data: customer } = await adminClient.from("customers").select("*").eq("phone", phone).maybeSingle();
    const { data: prevOrders } = await adminClient.from("orders").select("status, total_bdt").eq("customer_phone", phone);
    
    const successCount = (prevOrders ?? []).filter((o: any) => o.status === "delivered").length;
    const cancelCount = (prevOrders ?? []).filter((o: any) => o.status === "cancelled").length;
    const totalInternal = (prevOrders ?? []).length;

    results.internal = {
      is_blocked: customer?.is_blocked ?? false,
      success_count: successCount,
      cancel_count: cancelCount,
      total_orders: totalInternal,
    };

    // 2. SCORING LOGIC
    let score = 0;
    const reasons: string[] = [];

    if (customer?.is_blocked) {
      score += 30;
      reasons.push("কাস্টমার ব্ল্যাকলিস্টেড (Manual)");
    }

    if (cancelCount > 0 && successCount === 0) {
      score += 20;
      reasons.push("আগের সব অর্ডার বাতিল হয়েছে");
    } else if (cancelCount > successCount && totalInternal > 1) {
      score += 15;
      reasons.push("সফল অর্ডারের চেয়ে বাতিল অর্ডারের সংখ্যা বেশি");
    }

    if (results.bd_courier?.success) {
      const bdRatio = parseFloat(results.bd_courier.order_ratio);
      if (bdRatio < 50 && results.bd_courier.total_order > 2) {
        score += 25;
        reasons.push(`BD Courier: কম ডেলিভারি রেশিও (${bdRatio}%)`);
      } else if (bdRatio < 80) {
        score += 10;
        reasons.push(`BD Courier: মাঝারি ডেলিভারি রেশিও (${bdRatio}%)`);
      }
    }

    if (results.steadfast?.risky || results.steadfast?.fraud_status === "risky") {
      score += 15;
      reasons.push("Steadfast: রিস্কি কাস্টমার হিসেবে ট্র্যাকিং হয়েছে");
    }

    if (orderId) {
      const { data: order } = await adminClient.from("orders").select("total_bdt, payment_method").eq("id", orderId).maybeSingle();
      if (order && order.payment_method === "COD" && order.total_bdt > 5000) {
        score += 10;
        reasons.push("হাই-ভ্যালু COD অর্ডার (৳৫০০০+)");
      }
    }

    score = Math.min(score, 100);
    results.scoring = {
      score,
      reasons,
      status: score > 60 ? "high" : score > 30 ? "medium" : "low",
    };

    // PERSIST RESULTS if orderId is provided
    if (orderId) {
      await adminClient.from("orders").update({
        fraud_score: score,
        fraud_status: results.scoring.status,
        fraud_reasons: reasons,
        fraud_check_at: new Date().toISOString()
      }).eq("id", orderId);
    }

    return json(200, results);

  } catch (error: any) {
    return json(500, { error: error.message });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
