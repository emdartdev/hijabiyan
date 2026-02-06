import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/lib/supabaseUrl";

const FN_URL = `${SUPABASE_URL}/functions/v1/admin-orders`;

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
    let msg = json?.message || json?.error || `Request failed (${res.status})`;
    if (json?.error?.message) msg = `${msg}: ${json.error.message}`;
    throw new Error(msg);
  }
  return json;
}

export type AdminOrderListRow = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  delivery_status: string;
  total_bdt: number;
  fraud_score?: number;
  fraud_status?: string;
  is_fraud?: boolean;
  created_at: string;
};

export type AdminOrderDetails = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address_bn: string;
  status: string;
  delivery_status: string;
  total_bdt: number;
  subtotal_bdt: number;
  delivery_fee_bdt: number;
  discount_bdt: number;
  payment_method: string;
  notes_bn: string | null;
  created_at: string;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
  fraud_score?: number;
  fraud_status?: string;
  fraud_reasons?: string[];
  is_fraud?: boolean;
};

export type AdminOrderItem = {
  id: string;
  title_bn: string;
  qty: number;
  unit_price_bdt: number;
  line_total_bdt: number;
  size_bn: string | null;
  color_bn: string | null;
};

export async function listOrders(params: { search?: string; limit?: number }) {
  const q = (params.search ?? "").trim();
  const limit = params.limit ?? 200;
  const data = await authedFetch(`?search=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`, {
    method: "GET",
  });
  return (data?.orders ?? []) as AdminOrderListRow[];
}

export async function getOrderDetails(id: string, opts?: { signal?: AbortSignal }) {
  const data = await authedFetch(`?id=${encodeURIComponent(id)}`, { method: "GET", signal: opts?.signal });
  return {
    order: (data?.order ?? null) as AdminOrderDetails | null,
    items: (data?.items ?? []) as AdminOrderItem[],
  };
}

export async function patchOrder(patch: {
  id: string;
  status?: string;
  delivery_status?: string;
  delivery_address_bn?: string;
  notes_bn?: string | null;
  delivery_partner_name?: string | null;
  delivery_partner_phone?: string | null;
  delivery_fee_bdt?: number;
}) {
  await authedFetch("", { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteOrder(id: string) {
  await authedFetch(`?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
