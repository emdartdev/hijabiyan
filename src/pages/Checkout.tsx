import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { useEffect, useMemo, useState } from "react";
import SiteButton from "@/components/site/SiteButton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cartSubtotal, clearCart, readCart, type CartItem } from "@/lib/cart";
import { formatBDT } from "@/lib/money";
import { useNavigate } from "react-router-dom";
import { SUPABASE_URL } from "@/lib/supabaseUrl";
import { useToast } from "@/components/ui/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";

type CreateOrderResponse = {
  ok: boolean;
  order?: {
    id: string;
    trackingCode: string;
    status: string;
    totalBdt: number;
    createdAt: string;
    customerPhone: string;
  };
  message?: string;
};

const DELIVERY_OPTIONS = [
  { id: "dhaka", label: "ঢাকা মেট্রো সিটি", cost: 60 },
  { id: "demra", label: "ডেমরা, কামরাঙ্গীরচর", cost: 80 },
  { id: "savar", label: "সাভার, গাজীপুর, কেরানীগঞ্জ, নারায়ণগঞ্জ", cost: 100 },
  { id: "other", label: "অন্যান্য জেলা, উপজেলা, বিভাগ", cost: 130 },
];

export default function Checkout() {
  usePageMeta("চেকআউট | hijabiyan.shop", "ডেলিভারি তথ্য দিন এবং COD অর্ডার কনফার্ম করুন।");

  const { toast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountBdt, setDiscountBdt] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deliveryArea, setDeliveryArea] = useState<string>("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const total = Math.max(0, subtotal + deliveryFee - Math.max(0, discountBdt));

  const handleDeliveryChange = (optionId: string) => {
    const option = DELIVERY_OPTIONS.find((o) => o.id === optionId);
    if (option) {
      setDeliveryArea(option.id);
      setDeliveryFee(option.cost);
    }
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setDiscountBdt(0);
      setCouponMessage(null);
      return;
    }
    setCouponApplying(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/coupon-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalBdt: subtotal }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data?.message || "কুপন যাচাই হয়নি।");
      if (!data?.ok) {
        setDiscountBdt(0);
        setCouponMessage(data?.message || "কুপন সঠিক নয়।");
        return;
      }
      const d = Math.max(0, Number(data?.discountBdt ?? 0));
      setDiscountBdt(d);
      setCouponMessage(d > 0 ? `কুপন অ্যাপ্লাই হয়েছে (-${formatBDT(d)})` : "কুপন অ্যাপ্লাই হয়েছে");
    } catch (e: any) {
      setDiscountBdt(0);
      setCouponMessage(e?.message ?? "কুপন যাচাই হয়নি।");
    } finally {
      setCouponApplying(false);
    }
  };

  const placeOrder = async () => {
    if (!items.length) {
      toast({ title: "কার্ট খালি", description: "চেকআউট করতে আগে কার্টে পণ্য যোগ করুন।" });
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast({ title: "তথ্য অসম্পূর্ণ", description: "নাম, ফোন এবং ঠিকানা দিন।" });
      return;
    }
    if (!deliveryArea) {
      toast({ title: "ডেলিভারি এরিয়া নির্বাচন করুন", description: "অনুগ্রহ করে আপনার ডেলিভারি এলাকা সিলেক্ট করুন।" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryAddressBn: address.trim(),
          notesBn: notes.trim() || null,
          couponCode: couponCode.trim() || null,
          items: items.map((it) => ({ productId: it.productId, variantId: it.variantId ?? null, qty: it.qty })),
          deliveryFee,
        }),
      });

      const data = (await res.json()) as CreateOrderResponse;
      if (!res.ok || !data.ok || !data.order) throw new Error(data.message || "অর্ডার করা যায়নি।");

      localStorage.setItem("hijabiyan_last_order_v1", JSON.stringify({ order: data.order, cart: items }));
      clearCart();
      setItems([]);
      navigate("/thank-you");
    } catch (e: any) {
      toast({ title: "সমস্যা হয়েছে", description: e?.message ?? "আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <h1 className="text-2xl font-bold tracking-tight">চেকআউট</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          পেমেন্ট মেথড: <b>ক্যাশ অন ডেলিভারি (COD)</b>
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <Card className="p-5">
              <div className="text-lg font-semibold">ডেলিভারি তথ্য</div>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">নাম</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ফোন</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ডেলিভারি এলাকা</label>
                  <div className="grid gap-2 mt-2">
                    {DELIVERY_OPTIONS.map((option) => (
                      <div
                        key={option.id}
                        onClick={() => handleDeliveryChange(option.id)}
                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${deliveryArea === option.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${deliveryArea === option.id ? "border-primary bg-primary" : "border-muted-foreground"
                              }`}
                          >
                            {deliveryArea === option.id && <div className="h-2 w-2 rounded-full bg-background" />}
                          </div>
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatBDT(option.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ঠিকানা</label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="বাড়ি/রোড/এলাকা, থানা, জেলা" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">নোট (ঐচ্ছিক)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="রং/সাইজ সম্পর্কে বিশেষ নির্দেশনা..." />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-lg font-semibold">পলিসি</div>
              <p className="mt-2 text-sm text-muted-foreground">
                অর্ডার কনফার্ম করার মাধ্যমে আপনি আমাদের <a className="text-primary underline" href="/terms">শর্তাবলী</a> এবং
                <a className="ml-1 text-primary underline" href="/returns">রিটার্ন পলিসি</a> মেনে নিচ্ছেন।
              </p>
            </Card>
          </section>

          <aside>
            <Card className="p-5">
              <div className="text-sm text-muted-foreground">সাবটোটাল</div>
              <div className="mt-1 text-lg font-semibold">{formatBDT(subtotal)}</div>

              <div className="mt-4">
                <label className="text-xs text-muted-foreground">কুপন কোড (ঐচ্ছিক)</label>
                <div className="mt-1 flex gap-2">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="যেমন: SAVE50" />
                  <SiteButton type="button" variant="secondary" onClick={applyCoupon} disabled={couponApplying || !subtotal}>
                    {couponApplying ? "চেক..." : "Apply"}
                  </SiteButton>
                </div>
                {couponMessage ? <div className="mt-2 text-xs text-muted-foreground">{couponMessage}</div> : null}
              </div>

              <div className="mt-3 text-sm text-muted-foreground">ডিসকাউন্ট</div>
              <div className="mt-1 font-medium">{discountBdt ? `-${formatBDT(discountBdt)}` : formatBDT(0)}</div>

              <div className="mt-3 text-sm text-muted-foreground">ডেলিভারি ফি</div>
              <div className="mt-1 font-medium">{deliveryFee ? formatBDT(deliveryFee) : "অর্ডার কনফার্মের পরে জানানো হবে"}</div>
              <div className="mt-4 border-t pt-4">
                <div className="text-sm text-muted-foreground">মোট</div>
                <div className="mt-1 text-2xl font-semibold">{formatBDT(total)}</div>
              </div>
              <SiteButton className="mt-5 w-full" size="lg" onClick={placeOrder} disabled={loading}>
                {loading ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
              </SiteButton>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
