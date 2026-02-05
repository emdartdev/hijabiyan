import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Card } from "@/components/ui/card";
import SiteButton from "@/components/site/SiteButton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { SUPABASE_URL } from "@/lib/supabaseUrl";
import { useToast } from "@/components/ui/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";

type TrackResponse =
  | { ok: true; order: { trackingCode: string; status: string; deliveryStatus?: string; createdAt: string; items: { titleBn: string; qty: number }[] } }
  | { ok: false; message: string };

const steps = [
  { key: "confirmed", label: "কনফার্মড" },
  { key: "packed", label: "প্যাকড" },
  { key: "shipped", label: "শিপড" },
  { key: "delivered", label: "ডেলিভারড" },
] as const;

export default function TrackOrder() {
  usePageMeta("অর্ডার ট্র্যাক | hijabiyan.shop", "ট্র্যাকিং কোড ও ফোন নম্বর দিয়ে অর্ডার স্ট্যাটাস দেখুন।");

  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const submit = async () => {
    if (!code.trim() || !phone.trim()) {
      toast({ title: "তথ্য দিন", description: "ট্র্যাকিং কোড এবং ফোন নম্বর দিন।" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/track-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode: code.trim(), phone: phone.trim() }),
      });
      const data = (await res.json()) as TrackResponse;
      if (!res.ok || !data.ok) throw new Error((data as any).message || "অর্ডার পাওয়া যায়নি।");
      setResult((data as any).order);
    } catch (e: any) {
      toast({ title: "পাওয়া যায়নি", description: e?.message ?? "আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  };

  const activeIdx = Math.max(0, steps.findIndex((s) => s.key === result?.status));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <h1 className="text-2xl font-bold tracking-tight">অর্ডার ট্র্যাক</h1>
        <p className="mt-1 text-sm text-muted-foreground">ট্র্যাকিং কোড + ফোন নম্বর দিয়ে অর্ডার স্ট্যাটাস দেখুন।</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-muted-foreground">ট্র্যাকিং কোড</label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="যেমন: HJ-XXXXXX" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ফোন</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
              </div>
              <SiteButton onClick={submit} disabled={loading}>
                {loading ? "খুঁজছি..." : "ট্র্যাক করুন"}
              </SiteButton>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold">স্ট্যাটাস</div>
            {result ? (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">
                  কোড: <b className="text-foreground">{result.trackingCode}</b>
                </div>
                {result.deliveryStatus && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    কুরিয়ার আপডেট: <span className="font-medium text-foreground">{result.deliveryStatus}</span>
                  </div>
                )}

                <div className="mt-4 grid gap-2">
                  {steps.map((s, idx) => {
                    const done = idx <= activeIdx;
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${done ? "bg-primary" : "bg-muted"}`} />
                        <div className={done ? "text-foreground" : "text-muted-foreground"}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                {result.items?.length ? (
                  <div className="mt-6">
                    <div className="text-sm font-medium">পণ্য</div>
                    <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                      {result.items.map((it: any, i: number) => (
                        <div key={`${it.titleBn}-${i}`} className="flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate">{it.titleBn}</div>
                          <div className="shrink-0">×{it.qty}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">এখানে আপনার অর্ডার স্ট্যাটাস দেখানো হবে।</p>
            )}
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
