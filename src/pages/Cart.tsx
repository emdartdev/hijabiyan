import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SiteButton from "@/components/site/SiteButton";
import { Card } from "@/components/ui/card";
import { cartSubtotal, readCart, updateCartQty, type CartItem } from "@/lib/cart";
import { formatBDT } from "@/lib/money";
import { NavLink } from "@/components/NavLink";
import { usePageMeta } from "@/hooks/use-page-meta";
import { convertDriveUrl } from "@/lib/image-utils";

export default function Cart() {
  usePageMeta("কার্ট | hijabiyan.shop", "আপনার নির্বাচিত পণ্যগুলো দেখুন ও চেকআউট করুন।");

  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  const setQty = (it: CartItem, qty: number) => {
    const next = updateCartQty(it.productId, it.variantId ?? null, qty);
    setItems(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <h1 className="text-2xl font-bold tracking-tight">আপনার কার্ট</h1>
        <p className="mt-1 text-sm text-muted-foreground">পরিমাণ ঠিক করুন, তারপর অর্ডার করুন এখনই।</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.length ? (
              items.map((it) => (
                <Card key={`${it.productId}::${it.variantId ?? ""}`} className="p-4">
                  <div className="flex gap-4">
                    <div className="h-20 w-16 overflow-hidden rounded-md border bg-muted">
                      {it.imageUrl ? <img src={convertDriveUrl(it.imageUrl)} alt={it.titleBn} className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{it.titleBn}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{[it.colorBn, it.sizeBn].filter(Boolean).join(" • ")}</div>
                      <div className="mt-2 flex items-center gap-2">
                        {it.baseUnitPriceBdt > it.unitPriceBdt ? (
                          <>
                            <span className="text-xs text-muted-foreground line-through opacity-60">{formatBDT(it.baseUnitPriceBdt)}</span>
                            <span className="text-sm font-bold text-primary">{formatBDT(it.unitPriceBdt)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold">{formatBDT(it.unitPriceBdt)}</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <SiteButton type="button" variant="secondary" size="sm" onClick={() => setQty(it, it.qty - 1)}>
                          −
                        </SiteButton>
                        <div className="w-10 text-center text-sm">{it.qty}</div>
                        <SiteButton type="button" variant="secondary" size="sm" onClick={() => setQty(it, it.qty + 1)}>
                          +
                        </SiteButton>
                        <SiteButton type="button" variant="ghost" size="sm" onClick={() => setQty(it, 0)} className="ml-auto">
                          ডিলিট
                        </SiteButton>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-sm text-muted-foreground">আপনার কার্ট খালি।</Card>
            )}
          </div>

          <aside>
            <Card className="p-5">
              <div className="text-sm text-muted-foreground">সাবটোটাল</div>
              <div className="mt-2 text-2xl font-semibold">{formatBDT(subtotal)}</div>
              <div className="mt-1 text-xs text-muted-foreground">ডেলিভারি ফি চেকআউটে যোগ হবে (প্রযোজ্য হলে)।</div>
              <div className="mt-5 grid gap-2">
                <Button asChild size="lg" disabled={!items.length}>
                  <NavLink to="/checkout">অর্ডার করুন এখনই</NavLink>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <NavLink to="/catalog">আরও কেনাকাটা</NavLink>
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const Button = SiteButton;
