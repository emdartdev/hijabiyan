import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/pages/admin/AdminShell";
import { useAdminGuard } from "@/pages/admin/useAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { usePageMeta } from "@/hooks/use-page-meta";
import { convertDriveUrl } from "@/lib/image-utils";

type CouponRow = {
  id: string;
  code: string;
  discount_flat_bdt: number;
  start_at: string | null;
  end_at: string | null;
  usage_limit: number | null;
  used_count: number;
  min_order_bdt: number;
  is_active: boolean;
  created_at: string;
};

type PopupRow = {
  id: string;
  title_bn: string | null;
  body_bn: string | null;
  image_url: string | null;
  image_path: string | null;
  link_url: string | null;
  is_active: boolean;
};

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string) {
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminMarketing() {
  usePageMeta("অ্যাডমিন | মার্কেটিং", "Coupons এবং Homepage coupon popup ম্যানেজ করুন।");

  const guard = useAdminGuard();
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  const selectedCoupon = useMemo(
    () => coupons.find((c) => c.id === selectedCouponId) ?? null,
    [coupons, selectedCouponId],
  );

  const [couponForm, setCouponForm] = useState<Partial<CouponRow>>({
    code: "",
    discount_flat_bdt: 0,
    min_order_bdt: 0,
    usage_limit: null,
    start_at: null,
    end_at: null,
    is_active: true,
  });
  const [busyCoupon, setBusyCoupon] = useState(false);

  const [popup, setPopup] = useState<PopupRow | null>(null);
  const [busyPopup, setBusyPopup] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!guard.loading && guard.isAdmin) {
      loadCoupons();
      loadPopup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.loading, guard.isAdmin]);

  useEffect(() => {
    if (!selectedCoupon) return;
    setCouponForm({
      id: selectedCoupon.id,
      code: selectedCoupon.code,
      discount_flat_bdt: selectedCoupon.discount_flat_bdt,
      min_order_bdt: selectedCoupon.min_order_bdt,
      usage_limit: selectedCoupon.usage_limit,
      start_at: selectedCoupon.start_at,
      end_at: selectedCoupon.end_at,
      is_active: selectedCoupon.is_active,
    });
  }, [selectedCouponId]);

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("id, code, discount_flat_bdt, start_at, end_at, usage_limit, used_count, min_order_bdt, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setCoupons((data ?? []) as any);
      if (!selectedCouponId && (data ?? []).length) setSelectedCouponId((data ?? [])[0].id);
    } catch (e: any) {
      toast({ title: "Coupons লোড হয়নি", description: e?.message ?? "" });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const newCoupon = () => {
    setSelectedCouponId(null);
    setCouponForm({
      code: "",
      discount_flat_bdt: 0,
      min_order_bdt: 0,
      usage_limit: null,
      start_at: null,
      end_at: null,
      is_active: true,
    });
  };

  const saveCoupon = async () => {
    const code = String(couponForm.code ?? "").trim();
    const discount = Math.max(0, Math.round(Number(couponForm.discount_flat_bdt ?? 0)));
    const minOrder = Math.max(0, Math.round(Number(couponForm.min_order_bdt ?? 0)));
    const usageLimitRaw = couponForm.usage_limit;
    const usageLimit = usageLimitRaw === null || usageLimitRaw === ("" as any) ? null : Math.max(0, Math.round(Number(usageLimitRaw)));
    const startAt = couponForm.start_at ?? null;
    const endAt = couponForm.end_at ?? null;

    if (!code) {
      toast({ title: "Coupon code দিন", description: "কুপন কোড ফাঁকা রাখা যাবে না।" });
      return;
    }
    if (!Number.isFinite(discount) || discount <= 0) {
      toast({ title: "Discount ভুল", description: "Flat discount (BDT) সঠিক দিন।" });
      return;
    }

    setBusyCoupon(true);
    try {
      const payload = {
        code,
        discount_flat_bdt: discount,
        min_order_bdt: minOrder,
        usage_limit: usageLimit,
        start_at: startAt,
        end_at: endAt,
        is_active: !!couponForm.is_active,
      };

      if (couponForm.id) {
        const { error } = await supabase.from("coupons").update(payload as any).eq("id", couponForm.id);
        if (error) throw error;
        toast({ title: "সেভ হয়েছে", description: "Coupon আপডেট হয়েছে।" });
      } else {
        const { data, error } = await supabase.from("coupons").insert(payload as any).select("id").single();
        if (error) throw error;
        toast({ title: "সেভ হয়েছে", description: "নতুন Coupon তৈরি হয়েছে।" });
        setSelectedCouponId(data.id);
      }

      await loadCoupons();
    } catch (e: any) {
      toast({ title: "সেভ হয়নি", description: e?.message ?? "" });
    } finally {
      setBusyCoupon(false);
    }
  };

  const deleteCoupon = async () => {
    if (!couponForm.id) return;
    const yes = confirm("এই Coupon ডিলিট করবেন?");
    if (!yes) return;

    setBusyCoupon(true);
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", couponForm.id);
      if (error) throw error;
      toast({ title: "ডিলিট হয়েছে" });
      setSelectedCouponId(null);
      newCoupon();
      await loadCoupons();
    } catch (e: any) {
      toast({ title: "ডিলিট হয়নি", description: e?.message ?? "" });
    } finally {
      setBusyCoupon(false);
    }
  };

  const loadPopup = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_coupon_popup")
        .select("id, title_bn, body_bn, image_url, image_path, link_url, is_active")
        .eq("id", "main")
        .maybeSingle();
      if (error) throw error;
      setPopup((data ?? null) as any);
    } catch (e: any) {
      toast({ title: "Popup লোড হয়নি", description: e?.message ?? "" });
    }
  };

  const savePopup = async () => {
    if (!popup) return;
    setBusyPopup(true);
    try {
      const { error } = await supabase
        .from("homepage_coupon_popup")
        .update({
          title_bn: (popup.title_bn ?? "").trim() || null,
          body_bn: (popup.body_bn ?? "").trim() || null,
          link_url: (popup.link_url ?? "").trim() || null,
          is_active: !!popup.is_active,
          image_url: popup.image_url ?? null,
          image_path: popup.image_path ?? null,
        } as any)
        .eq("id", "main");
      if (error) throw error;
      toast({ title: "সেভ হয়েছে", description: "Homepage popup আপডেট হয়েছে।" });
      await loadPopup();
    } catch (e: any) {
      toast({ title: "সেভ হয়নি", description: e?.message ?? "" });
    } finally {
      setBusyPopup(false);
    }
  };

  const removePopupImage = async () => {
    if (!popup) return;
    setBusyPopup(true);
    try {
      const path = popup.image_path;
      if (path) {
        await supabase.storage.from("promo-assets").remove([path]);
      }
      setPopup((p) => (p ? { ...p, image_url: null, image_path: null } : p));
      toast({ title: "Image removed", description: "সেভ করতে ভুলবেন না।" });
    } finally {
      setBusyPopup(false);
    }
  };

  const uploadPopupImage = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `homepage/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("promo-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("promo-assets").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      if (!publicUrl) throw new Error("Public URL পাওয়া যায়নি");

      setPopup((p) => (p ? { ...p, image_url: publicUrl, image_path: path } : p));
      toast({ title: "Upload হয়েছে", description: "সেভ করতে ভুলবেন না।" });
    } catch (e: any) {
      toast({ title: "Upload হয়নি", description: e?.message ?? "" });
    } finally {
      setUploading(false);
    }
  };

  const resetPopup = async () => {
    if (!popup) return;
    if (!confirm("Popup রিসেট/রিমুভ করবেন? সব কনটেন্ট মুছে যাবে।")) return;

    setBusyPopup(true);
    try {
      // Remove image from storage if exists
      if (popup.image_path) {
        await supabase.storage.from("promo-assets").remove([popup.image_path]);
      }

      const { error } = await supabase
        .from("homepage_coupon_popup")
        .update({
          title_bn: null,
          body_bn: null,
          link_url: null,
          image_url: null,
          image_path: null,
          is_active: false,
        } as any)
        .eq("id", "main");

      if (error) throw error;

      toast({ title: "Reset হয়েছে", description: "Popup এখন খালি এবং বন্ধ।" });
      await loadPopup();
    } catch (e: any) {
      toast({ title: "Reset হয়নি", description: e?.message ?? "" });
    } finally {
      setBusyPopup(false);
    }
  };

  if (guard.loading) {
    return (
      <AdminShell title="মার্কেটিং">
        <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
      </AdminShell>
    );
  }
  if (!guard.isAdmin) return null;

  return (
    <AdminShell title="মার্কেটিং & প্রোমোশন">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <aside>
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Coupons</div>
              <Button size="sm" onClick={newCoupon}>
                নতুন
              </Button>
            </div>

            <div className="mt-4 grid gap-2 max-h-[520px] overflow-auto pr-1">
              {loadingCoupons ? (
                <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
              ) : coupons.length ? (
                coupons.map((c) => {
                  const active = c.id === selectedCouponId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCouponId(c.id)}
                      className={[
                        "w-full rounded-md border p-3 text-left transition-colors",
                        active ? "bg-secondary" : "bg-card hover:bg-secondary/40",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{c.code}</div>
                        <div className="text-xs text-muted-foreground">{c.is_active ? "Active" : "Off"}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Flat: {c.discount_flat_bdt} | Min: {c.min_order_bdt} | Used: {c.used_count}
                        {c.usage_limit != null ? `/${c.usage_limit}` : ""}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">কোনো coupon নেই।</div>
              )}
            </div>
          </Card>
        </aside>

        <section className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Coupon Editor</div>
                <div className="text-lg font-semibold">{couponForm.id ? "Coupon আপডেট" : "নতুন Coupon"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {couponForm.id ? (
                  <Button variant="secondary" onClick={deleteCoupon} disabled={busyCoupon}>
                    ডিলিট
                  </Button>
                ) : null}
                <Button onClick={saveCoupon} disabled={busyCoupon}>
                  {busyCoupon ? "সেভ হচ্ছে..." : "সেভ"}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Coupon code</label>
                <Input value={couponForm.code ?? ""} onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))} placeholder="যেমন: SAVE50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Discount (Flat BDT)</label>
                <Input
                  value={String(couponForm.discount_flat_bdt ?? 0)}
                  inputMode="numeric"
                  onChange={(e) => setCouponForm((f) => ({ ...f, discount_flat_bdt: Number(e.target.value) as any }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Min order (BDT)</label>
                <Input
                  value={String(couponForm.min_order_bdt ?? 0)}
                  inputMode="numeric"
                  onChange={(e) => setCouponForm((f) => ({ ...f, min_order_bdt: Number(e.target.value) as any }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Usage limit (optional)</label>
                <Input
                  value={couponForm.usage_limit == null ? "" : String(couponForm.usage_limit)}
                  inputMode="numeric"
                  onChange={(e) => setCouponForm((f) => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) as any : null }))}
                  placeholder="যেমন: 100"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Start at (optional)</label>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocalValue(couponForm.start_at ?? null)}
                  onChange={(e) => setCouponForm((f) => ({ ...f, start_at: fromDatetimeLocalValue(e.target.value) as any }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End at (optional)</label>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocalValue(couponForm.end_at ?? null)}
                  onChange={(e) => setCouponForm((f) => ({ ...f, end_at: fromDatetimeLocalValue(e.target.value) as any }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!couponForm.is_active} onCheckedChange={(v) => setCouponForm((f) => ({ ...f, is_active: v as any }))} />
                <span className="text-sm">Active</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Homepage Coupon Popup</div>
                <div className="text-lg font-semibold">Popup সেটিংস</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={resetPopup} disabled={busyPopup || !popup}>
                  Reset/Remove
                </Button>
                <Button onClick={savePopup} disabled={busyPopup || !popup}>
                  {busyPopup ? "সেভ হচ্ছে..." : "সেভ"}
                </Button>
              </div>
            </div>

            {!popup ? (
              <div className="mt-4 text-sm text-muted-foreground">লোড হচ্ছে...</div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="flex items-center gap-3">
                  <Switch checked={!!popup.is_active} onCheckedChange={(v) => setPopup((p) => (p ? { ...p, is_active: v } : p))} />
                  <span className="text-sm">Active</span>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Title (বাংলা)</label>
                  <Input value={popup.title_bn ?? ""} onChange={(e) => setPopup((p) => (p ? { ...p, title_bn: e.target.value } : p))} placeholder="যেমন: নতুন কুপন এসেছে!" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Body (বাংলা)</label>
                  <Textarea value={popup.body_bn ?? ""} onChange={(e) => setPopup((p) => (p ? { ...p, body_bn: e.target.value } : p))} placeholder="যেমন: SAVE50 কোডে ৫০ টাকা ছাড়..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Link URL (optional)</label>
                  <Input value={popup.link_url ?? ""} onChange={(e) => setPopup((p) => (p ? { ...p, link_url: e.target.value } : p))} placeholder="/catalog বা https://..." />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Popup image</label>
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPopupImage(f);
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Upload করার পর Save চাপুন।</p>
                  </div>

                  <div className="flex items-end justify-end">
                    <Button variant="secondary" onClick={removePopupImage} disabled={!popup.image_url || busyPopup}>
                      Image remove
                    </Button>
                  </div>
                </div>

                {popup.image_url ? (
                  <div className="rounded-md border p-3">
                    <img src={convertDriveUrl(popup.image_url)} alt={popup.title_bn ?? "Popup image"} className="w-full max-w-md rounded" loading="lazy" />
                    <div className="mt-2 text-xs text-muted-foreground break-all">{popup.image_url}</div>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}
