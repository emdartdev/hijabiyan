import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ProductCard, { type ProductCardModel } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import SiteButton from "@/components/site/SiteButton";
import { Input } from "@/components/ui/input";
import { usePageMeta } from "@/hooks/use-page-meta";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Catalog() {
  const { categorySlug } = useParams();
  const q = useQuery();

  const [search, setSearch] = useState(q.get("search") ?? "");
  const [minPrice, setMinPrice] = useState(q.get("min") ?? "");
  const [maxPrice, setMaxPrice] = useState(q.get("max") ?? "");
  const [color, setColor] = useState(q.get("color") ?? "");
  const [size, setSize] = useState(q.get("size") ?? "");

  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductCardModel[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMeta(categorySlug ? `ক্যাটালগ | ${categorySlug}` : "ক্যাটালগ | hijabiyan.shop", "আপনার পছন্দের হিজাব ও মডেস্ট ফ্যাশন খুঁজুন—ফিল্টার ও সার্চ সহ।");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);

      let categoryId: string | null = null;
      if (categorySlug) {
        const { data: cat } = await supabase.from("categories").select("id, name_bn").eq("slug", categorySlug).maybeSingle();
        categoryId = cat?.id ?? null;
        if (!ignore) setCategoryName(cat?.name_bn ?? null);
      } else {
        if (!ignore) setCategoryName(null);
      }

      let query = supabase
        .from("products")
        .select("id, slug, title_bn, price_bdt, compare_at_price_bdt, product_images(image_url, sort_order)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(60);

      if (categoryId) query = query.eq("category_id", categoryId);
      const s = search.trim();
      if (s) query = query.ilike("title_bn", `%${s}%`);
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!Number.isNaN(min) && minPrice !== "") query = query.gte("price_bdt", min);
      if (!Number.isNaN(max) && maxPrice !== "") query = query.lte("price_bdt", max);

      const { data: base } = await query;
      const baseProducts = (base ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug,
        title_bn: r.title_bn,
        price_bdt: r.price_bdt,
        compare_at_price_bdt: r.compare_at_price_bdt,
        image_url: (r.product_images ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url ?? null,
      })) as ProductCardModel[];

      if (!color.trim() && !size.trim()) {
        if (!ignore) setProducts(baseProducts);
        setLoading(false);
        return;
      }

      const ids = baseProducts.map((p) => p.id);
      const { data: vars } = await supabase
        .from("product_variants")
        .select("product_id, color_bn, size_bn")
        .in("product_id", ids)
        .eq("is_active", true);

      const wantColor = color.trim();
      const wantSize = size.trim();
      const ok = new Set(
        (vars ?? [])
          .filter((v) => (!wantColor || (v.color_bn ?? "").includes(wantColor)) && (!wantSize || (v.size_bn ?? "").includes(wantSize)))
          .map((v) => v.product_id as string),
      );
      const filtered = baseProducts.filter((p) => ok.has(p.id));
      if (!ignore) setProducts(filtered);
      setLoading(false);
    };
    load();
    return () => {
      ignore = true;
    };
  }, [categorySlug, search, minPrice, maxPrice, color, size]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{categoryName ?? "সব পণ্য"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">সার্চ ও ফিল্টার ব্যবহার করে দ্রুত খুঁজুন।</p>
          </div>
          <SiteButton asChild variant="secondary">
            <a href="#products">পণ্য দেখুন</a>
          </SiteButton>
        </div>

        <section className="mt-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5" aria-label="ফিল্টার">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">সার্চ</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="যেমন: কালো, প্রিন্ট, সিল্ক..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">সর্বনিম্ন দাম</label>
            <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} inputMode="numeric" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">সর্বোচ্চ দাম</label>
            <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="numeric" placeholder="2000" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <div>
              <label className="text-xs text-muted-foreground">রং</label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="কালো" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">সাইজ</label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="স্ট্যান্ডার্ড" />
            </div>
          </div>
        </section>

        <section id="products" className="mt-8">
          {loading ? (
            <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
          ) : products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">কোনো পণ্য পাওয়া যায়নি।</div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

const Button = SiteButton;
