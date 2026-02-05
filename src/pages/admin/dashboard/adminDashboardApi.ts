import { supabase } from "@/integrations/supabase/client";

const FN_URL = "https://smouckatsuzrzhqlsjcq.functions.supabase.co/admin-dashboard";

async function authedFetch(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const res = await fetch(`${FN_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export type AdminDashboardStats = {
  todayOrders: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  lowStockCount: number;
};

export type AdminDashboardBestSeller = {
  product_id: string;
  title_bn: string;
  total_qty: number;
  total_revenue: number;
};

export async function getAdminDashboard() {
  const data = await authedFetch("", { method: "GET" });
  return {
    stats: (data?.stats ?? null) as AdminDashboardStats | null,
    bestSellers: (data?.bestSellers ?? []) as AdminDashboardBestSeller[],
  };
}
