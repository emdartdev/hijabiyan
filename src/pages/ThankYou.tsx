import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Card } from "@/components/ui/card";
import SiteButton from "@/components/site/SiteButton";
import { formatBDT } from "@/lib/money";
import { useMemo } from "react";
import { NavLink } from "@/components/NavLink";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function ThankYou() {
  usePageMeta("ধন্যবাদ | hijabiyan.shop", "আপনার অর্ডার সফল হয়েছে। ট্র্যাকিং কোড সংরক্ষণ করুন।");

  const last = useMemo(() => {
    try {
      const raw = localStorage.getItem("hijabiyan_last_order_v1");
      return raw ? (JSON.parse(raw) as any) : null;
    } catch {
      return null;
    }
  }, []);

  const order = last?.order;
  const cart = (last?.cart ?? []) as any[];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <h1 className="text-2xl font-bold tracking-tight">ধন্যবাদ! আপনার অর্ডার নেওয়া হয়েছে</h1>
        <p className="mt-1 text-sm text-muted-foreground">ট্র্যাকিং কোড এবং ফোন নম্বর দিয়ে যেকোনো সময় অর্ডার ট্র্যাক করতে পারবেন।</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <Card className="p-5">
              <div className="text-lg font-semibold">অর্ডার তথ্য</div>
              {order ? (
                <div className="mt-4 grid gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">ট্র্যাকিং কোড:</span> <b>{order.trackingCode}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">স্ট্যাটাস:</span> <b>{order.status}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">মোট:</span> <b>{formatBDT(order.totalBdt)}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ফোন:</span> <b>{order.customerPhone}</b>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">অর্ডার তথ্য পাওয়া যায়নি।</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <SiteButton asChild>
                  <NavLink to="/track">অর্ডার ট্র্যাক করুন</NavLink>
                </SiteButton>
                <SiteButton asChild variant="secondary">
                  <NavLink to="/catalog">আরও কেনাকাটা</NavLink>
                </SiteButton>
              </div>
            </Card>

            {cart.length ? (
              <Card className="p-5">
                <div className="text-lg font-semibold">অর্ডার করা পণ্য</div>
                <div className="mt-4 space-y-3">
                  {cart.map((it) => (
                    <div key={`${it.productId}::${it.variantId ?? ""}`} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{it.titleBn}</div>
                        <div className="text-xs text-muted-foreground">{[it.colorBn, it.sizeBn].filter(Boolean).join(" • ")}</div>
                      </div>
                      <div className="shrink-0 text-muted-foreground">×{it.qty}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </section>

          <aside>
            <Card className="p-5">
              <div className="font-semibold">পরবর্তী ধাপ</div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>1) অর্ডার কনফার্ম</li>
                <li>2) প্যাক করা হবে</li>
                <li>3) শিপ করা হবে</li>
                <li>4) ডেলিভারড</li>
              </ol>
            </Card>

            <Card className="mt-4 p-5">
              <div className="font-semibold">ডেলিভারি তথ্য</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                ঢাকার ভিতরে ও ঢাকার বাইরে ডেলিভারি সুবিধা উপলব্ধ। পণ্য গ্রহণের সময় ডেলিভারি ম্যানের উপস্থিতিতেই ভালোভাবে চেক করে নেবেন। পণ্যে কোনো সমস্যা থাকলে সঙ্গে সঙ্গে জানাতে হবে। ডেলিভারি সম্পন্ন হওয়ার পর বা পরবর্তীতে সমস্যা জানালে রিটার্ন বা রিফান্ড গ্রহণযোগ্য হবে না।পণ্য পছন্দ না হলে বা নিতে না চাইলে ডেলিভারি চার্জ পরিশোধ করে পণ্য রিটার্ন করতে পারবেন।
              </p>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
