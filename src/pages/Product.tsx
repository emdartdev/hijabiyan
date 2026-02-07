import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import SiteButton from "@/components/site/SiteButton";
import { Card } from "@/components/ui/card";
import { formatBDT } from "@/lib/money";
import { upsertCartItem } from "@/lib/cart";
import { useToast } from "@/components/ui/use-toast";
import ProductCard, { type ProductCardModel } from "@/components/site/ProductCard";
import { usePageMeta } from "@/hooks/use-page-meta";
import { convertDriveUrl } from "@/lib/image-utils";

type Variant = {
  id: string;
  color_bn: string | null;
  size_bn: string | null;
  price_bdt: number | null;
  stock_qty: number;
  price_tiers?: { min_qty: number; unit_price: number }[];
  gift_rules?: { min_qty: number; gift_name: string }[];
};

export default function Product() {
  const { productSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [qty, setQty] = useState(1);

  const [p, setP] = useState<any | null>(null);
  const [images, setImages] = useState<{ image_url: string; alt_bn: string | null; sort_order: number }[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [related, setRelated] = useState<ProductCardModel[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedVariant = useMemo(() => variants.find((v) => v.id === selectedVariantId) ?? null, [variants, selectedVariantId]);

  usePageMeta(p ? `${p.title_bn} | hijabiyan.shop` : "পণ্য | hijabiyan.shop", p?.description_bn ?? undefined);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);

      const { data: prod } = await supabase
        .from("products")
        .select("id, slug, title_bn, description_bn, return_policy_bn, delivery_info_bn, price_bdt, discount_price_bdt, compare_at_price_bdt, category_id, price_tiers, gift_rules, categories(slug)")
        .eq("slug", productSlug)
        .maybeSingle();

      if (!prod) {
        if (!ignore) setP(null);
        console.log("Product not found for slug:", productSlug);
        setLoading(false);
        return;
      }

      console.log("Loaded product data:", prod);
      console.log("Price Tiers:", prod.price_tiers);
      console.log("Gift Rules:", prod.gift_rules);

      const [{ data: imgs }, { data: vars }] = await Promise.all([
        supabase.from("product_images").select("image_url, alt_bn, sort_order").eq("product_id", prod.id).order("sort_order", { ascending: true }),
        supabase.from("product_variants").select("id, color_bn, size_bn, price_bdt, stock_qty").eq("product_id", prod.id).eq("is_active", true).order("created_at", { ascending: true }),
      ]);

      if (!ignore) {
        setP(prod);
        setImages(imgs ?? []);
        setVariants(vars ?? []);
        setSelectedVariantId((vars ?? [])[0]?.id ?? null);
      }

      const { data: rel } = await supabase
        .from("products")
        .select("id, slug, title_bn, price_bdt, discount_price_bdt, compare_at_price_bdt, price_tiers, gift_rules, product_images(image_url, sort_order), categories(slug)")
        .eq("category_id", prod.category_id)
        .neq("id", prod.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);

      const relatedMapped: ProductCardModel[] = (rel ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug,
        title_bn: r.title_bn,
        price_bdt: r.price_bdt,
        discount_price_bdt: r.discount_price_bdt,
        compare_at_price_bdt: r.compare_at_price_bdt,
        price_tiers: r.price_tiers,
        gift_rules: r.gift_rules,
        categorySlug: r.categories?.slug ?? null,
        image_url: (r.product_images ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url ?? null,
      }));
      if (!ignore) setRelated(relatedMapped);

      setLoading(false);
    };
    load();
    return () => {
      ignore = true;
    };
  }, [productSlug]);

  const priceBdt = selectedVariant?.price_bdt ?? p?.price_bdt;
  const mainImage = images[0]?.image_url ?? null;

  const orderNow = () => {
    if (!p) return;
    const v = selectedVariant;
    const currentPrice = getEffectiveUnitPrice();
    upsertCartItem({
      productId: p.id,
      variantId: v?.id ?? null,
      titleBn: p.title_bn,
      imageUrl: mainImage,
      colorBn: v?.color_bn ?? null,
      sizeBn: v?.size_bn ?? null,
      unitPriceBdt: currentPrice,
      baseUnitPriceBdt: Number(priceBdt ?? 0),
      price_tiers: p.price_tiers,
      qty: qty,
      categorySlug: p.categories?.slug ?? null,
    });
    navigate("/checkout");
  };

  const handleAddToCart = () => {
    if (!p) return;
    const v = selectedVariant;
    const currentPrice = getEffectiveUnitPrice();
    upsertCartItem({
      productId: p.id,
      variantId: v?.id ?? null,
      titleBn: p.title_bn,
      imageUrl: mainImage,
      colorBn: v?.color_bn ?? null,
      sizeBn: v?.size_bn ?? null,
      unitPriceBdt: currentPrice,
      baseUnitPriceBdt: Number(priceBdt ?? 0),
      price_tiers: p.price_tiers,
      qty: qty,
      categorySlug: p.categories?.slug ?? null,
    });
    
    toast({
      title: "কার্টে যোগ হয়েছে",
      description: `${p.title_bn} কার্টে যোগ করা হয়েছে।`
    });
  };

  const getEffectiveUnitPrice = () => {
    return Number(selectedVariant?.price_bdt ?? p?.price_bdt ?? 0);
  };

  const getEarnedGifts = () => {
    if (!p?.gift_rules) return [];
    return p.gift_rules.filter(r => qty >= r.min_qty);
  };

  const totalPrice = useMemo(() => {
    return getEffectiveUnitPrice() * qty;
  }, [qty, selectedVariant, p]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        {loading ? (
          <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : !p ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">পণ্য পাওয়া যায়নি।</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="aspect-[4/5] overflow-hidden rounded-lg border bg-muted">
                {mainImage ? (
                  <img src={convertDriveUrl(mainImage)} alt={p.title_bn} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">ছবি নেই</div>
                )}
              </div>
              {images.length > 1 ? (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {images.slice(0, 5).map((im) => (
                    <div key={im.image_url} className="aspect-square overflow-hidden rounded-md border bg-muted">
                      <img src={convertDriveUrl(im.image_url)} alt={im.alt_bn ?? p.title_bn} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{p.title_bn}</h1>
              <div className="mt-4 flex items-center gap-4">
                {p.discount_price_bdt ? (
                  <>
                    <div className="text-lg text-muted-foreground line-through opacity-60">
                      {formatBDT(p.price_bdt)}
                    </div>
                    <div className="text-3xl font-bold text-primary">{formatBDT(p.discount_price_bdt)}</div>
                  </>
                ) : p.compare_at_price_bdt && p.compare_at_price_bdt > p.price_bdt ? (
                  <>
                    <div className="text-lg text-muted-foreground line-through opacity-60">
                      {formatBDT(p.compare_at_price_bdt)}
                    </div>
                    <div className="text-3xl font-bold text-primary">{formatBDT(p.price_bdt)}</div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-primary">{formatBDT(priceBdt)}</div>
                )}
              </div>


              {p.gift_rules && p.gift_rules.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {p.gift_rules.map((r, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${qty >= r.min_qty ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-muted bg-muted/30 text-muted-foreground'}`}
                    >
                      <span className="text-sm">🎁</span>
                      {r.gift_name}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">পরিমাণ:</div>
                  <div className="flex h-10 w-32 items-center overflow-hidden rounded-md border">
                    <button 
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="flex h-full w-10 items-center justify-center bg-muted hover:bg-muted-foreground/10 transition-colors"
                    >
                      -
                    </button>
                    <div className="flex flex-1 items-center justify-center font-semibold">{qty}</div>
                    <button 
                      onClick={() => setQty(qty + 1)}
                      className="flex h-full w-10 items-center justify-center bg-muted hover:bg-muted-foreground/10 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-lg">
                  <span className="font-medium">মোট:</span>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-primary text-3xl leading-none">
                      {formatBDT(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {variants.length ? (
                <Card className="mt-6 p-4">
                  <div className="text-sm font-medium">ভ্যারিয়েন্ট</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const label = [v.color_bn, v.size_bn].filter(Boolean).join(" • ") || "স্ট্যান্ডার্ড";
                      const active = v.id === selectedVariantId;
                      return (
                        <SiteButton key={v.id} type="button" variant={active ? "default" : "secondary"} size="sm" onClick={() => setSelectedVariantId(v.id)}>
                          {label}
                        </SiteButton>
                      );
                    })}
                  </div>
                </Card>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <SiteButton onClick={orderNow} size="lg" className="flex-1 md:flex-none">
                  অর্ডার করুন
                </SiteButton>
                <SiteButton onClick={handleAddToCart} variant="outline" size="lg" className="flex-1 md:flex-none">
                  কার্টে এড করুন
                </SiteButton>
                <SiteButton asChild size="lg" variant="secondary" className="flex-1 md:flex-none">
                  <a href="/cart">কার্ট দেখুন</a>
                </SiteButton>
              </div>

              {p.description_bn ? (
                <section className="mt-8">
                  <h2 className="text-lg font-semibold">বিস্তারিত</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-line">{p.description_bn}</p>
                </section>
              ) : null}

              <section className="mt-8 grid gap-4">
                <Card className="p-4">
                  <div className="font-medium">ডেলিভারি তথ্য</div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                    {p.delivery_info_bn ??
                      "ঢাকার ভিতরে ও ঢাকার বাইরে ডেলিভারি সুবিধা উপলব্ধ। পণ্য গ্রহণের সময় ডেলিভারি ম্যানের উপস্থিতিতেই ভালোভাবে চেক করে নেবেন। পণ্যে কোনো সমস্যা থাকলে সঙ্গে সঙ্গে জানাতে হবে। ডেলিভারি সম্পন্ন হওয়ার পর বা পরবর্তীতে সমস্যা জানালে রিটার্ন বা রিফান্ড গ্রহণযোগ্য হবে না।"}
                  </p>
                </Card>
                <Card className="p-4">
                  <div className="font-medium">রিটার্ন পলিসি</div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                    {p.return_policy_bn ?? "পণ্য গ্রহণের সময় ডেলিভারি ম্যানের উপস্থিতিতেই চেক করুন। কোনো সমস্যা থাকলে সঙ্গে সঙ্গে জানাতে হবে। ডেলিভারি সম্পন্ন হওয়ার পর রিটার্ন বা রিফান্ড প্রযোজ্য নয়। পণ্য গ্রহণ না করলে ডেলিভারি চার্জ পরিশোধ করে রিটার্ন করতে পারবেন।"}
                  </p>
                </Card>
              </section>
            </div>
          </div>
        )}

        {related.length ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">সম্পর্কিত পণ্য</h2>
            <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {related.map((rp) => (
                <ProductCard key={rp.id} p={rp} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
