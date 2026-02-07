import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/pages/admin/AdminShell";
import { useAdminGuard } from "@/pages/admin/useAdminGuard";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/money";

type CustomerSummary = {
  phone: string;
  name: string | null;
  is_blocked: boolean;
  notes: string | null;
  total_orders: number;
  total_spent_bdt: number;
};

type OrderSummary = {
  id: string;
  tracking_code: string;
  status: string;
  total_bdt: number;
  created_at: string;
};

type CustomerProfile = CustomerSummary & { orders: OrderSummary[] };

const FN_URL = "https://smouckatsuzrzhqlsjcq.functions.supabase.co/admin-customers";

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

export default function AdminCustomers() {
  usePageMeta("অ্যাডমিন | কাস্টমার", "কাস্টমার প্রোফাইল, ব্লক/আনব্লক এবং অর্ডার হিস্টোরি");

  const guard = useAdminGuard();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const q = search.trim();
      const data = await authedFetch(`?search=${encodeURIComponent(q)}`, { method: "GET" });
      setCustomers((data?.customers ?? []) as CustomerSummary[]);
      if (!selectedPhone && (data?.customers ?? []).length) setSelectedPhone((data.customers[0] as any).phone);
    } catch (e: any) {
      toast({ title: "কাস্টমার লোড হয়নি", description: e?.message ?? "আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (phone: string) => {
    try {
      const data = await authedFetch(`?phone=${encodeURIComponent(phone)}`, { method: "GET" });
      setProfile((data?.customer ?? null) as CustomerProfile | null);
    } catch (e: any) {
      setProfile(null);
      toast({ title: "প্রোফাইল লোড হয়নি", description: e?.message ?? "" });
    }
  };

  useEffect(() => {
    if (!guard.loading && guard.isAdmin) loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.loading, guard.isAdmin]);

  useEffect(() => {
    if (selectedPhone) loadProfile(selectedPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhone]);

  const filtered = useMemo(() => {
    const s = search.trim();
    if (!s) return customers;
    return customers.filter((c) => (c.phone ?? "").includes(s) || (c.name ?? "").includes(s));
  }, [customers, search]);

  const saveCustomer = async (patch: { phone: string; name?: string | null; notes?: string | null; is_blocked?: boolean }) => {
    setBusy(true);
    try {
      await authedFetch("", { method: "PATCH", body: JSON.stringify(patch) });
      await loadCustomers();
      if (patch.phone) await loadProfile(patch.phone);
      toast({ title: "আপডেট হয়েছে" });
    } catch (e: any) {
      toast({ title: "আপডেট হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  if (guard.loading) return <AdminShell title="কাস্টমার"><div className="text-sm text-muted-foreground">লোড হচ্ছে...</div></AdminShell>;
  if (!guard.isAdmin) return null;

  return (
    <AdminShell title="Customer Management">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="order-2 lg:order-1">
          <Card className="p-4">
            <div className="text-sm font-medium">কাস্টমার তালিকা</div>
            <div className="mt-3 flex gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ফোন/নাম দিয়ে খুঁজুন" className="h-9 text-sm" />
              <Button size="sm" variant="outline" onClick={() => loadCustomers()} disabled={loading}>
                রিফ্রেশ
              </Button>
            </div>
            <div className="mt-4 grid gap-2 max-h-[500px] lg:max-h-[600px] overflow-auto pr-1">
              {loading ? (
                <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
              ) : filtered.length ? (
                filtered.map((c) => {
                  const active = c.phone === selectedPhone;
                  return (
                    <button
                      key={c.phone}
                      type="button"
                      onClick={() => {
                        setSelectedPhone(c.phone);
                        if (window.innerWidth < 1024) {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={[
                        "w-full rounded-md border p-3 text-left transition-colors",
                        active ? "bg-secondary" : "bg-card hover:bg-secondary/40",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium truncate">{c.name || "(নাম নেই)"}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{c.is_blocked ? "Blocked" : ""}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between gap-2">
                        <span>{c.phone}</span>
                        <span>
                          {c.total_orders} অর্ডার
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">কোনো কাস্টমার নেই।</div>
              )}
            </div>
          </Card>
        </aside>

        <section className="order-1 lg:order-2 space-y-6">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">Customer Profile</div>
                <div className="text-base sm:text-lg font-semibold">{profile?.name || profile?.phone || "সিলেক্ট করুন"}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={profile?.is_blocked ? "secondary" : "destructive"}
                  disabled={busy || !profile}
                  onClick={() =>
                    profile &&
                    saveCustomer({
                      phone: profile.phone,
                      is_blocked: !profile.is_blocked,
                    })
                  }
                >
                  {profile?.is_blocked ? "Unblock" : "Block"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!profile}
                  onClick={() => {
                    if (!profile) return;
                    toast({ title: "Manual order", description: "পরের ধাপে manual order form যুক্ত করব।" });
                  }}
                >
                  Manual order
                </Button>
              </div>
            </div>

            {!profile ? (
              <div className="mt-4 text-sm text-muted-foreground">কাস্টমার সিলেক্ট করলে এখানে ডিটেইল দেখাবে।</div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 grid-cols-2">
                  <div className="rounded-md border bg-card p-3">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Phone number</div>
                    <div className="mt-0.5 text-sm font-medium">{profile.phone}</div>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Total spent</div>
                    <div className="mt-0.5 text-sm font-medium">{formatBDT(profile.total_spent_bdt)}</div>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Total orders</div>
                    <div className="mt-0.5 text-sm font-medium">{profile.total_orders}</div>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Status</div>
                    <div className="mt-0.5 text-sm font-medium">{profile.is_blocked ? "Blocked" : "Active"}</div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground opacity-70">Name</label>
                    <Input
                      className="mt-1 h-9 text-sm"
                      value={profile.name ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground opacity-70">Notes (VIP / Fraud / Regular)</label>
                    <Textarea
                      className="mt-1 text-sm"
                      value={profile.notes ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, notes: e.target.value } : p))}
                      rows={2}
                      placeholder="VIP / Fraud / Regular ..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => saveCustomer({ phone: profile.phone, name: (profile.name ?? "").trim() || null, notes: (profile.notes ?? "").trim() || null })}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">Order history</div>
                <div className="text-base sm:text-lg font-semibold">Past orders</div>
              </div>
              <Button size="sm" variant="outline" disabled={!profile} onClick={() => profile && loadProfile(profile.phone)}>
                রিফ্রেশ
              </Button>
            </div>

            {!profile ? (
              <div className="mt-4 text-sm text-muted-foreground">কাস্টমার সিলেক্ট করুন।</div>
            ) : profile.orders?.length ? (
              <div className="mt-4 grid gap-2">
                {profile.orders.map((o) => {
                  const date = new Date(o.created_at).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
                  return (
                    <div key={o.id} className="flex flex-col gap-1 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-medium">#{o.tracking_code}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                          {date} · {o.status}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{formatBDT(o.total_bdt)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">কোনো অর্ডার পাওয়া যায়নি।</div>
            )}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}
