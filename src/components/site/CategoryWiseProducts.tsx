import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteButton from "@/components/site/SiteButton";
import { Card } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import ProductCard, { type ProductCardModel } from "@/components/site/ProductCard";

type Category = {
  id: string;
  slug: string;
  name_bn: string;
  hero_rank: number;
};

function mapProductRow(r: any): (ProductCardModel & { category_id: string; created_at: string }) | null {
  if (!r?.id || !r?.slug) return null;
  return {
    id: r.id,
    slug: r.slug,
    title_bn: r.title_bn,
    price_bdt: r.price_bdt,
    discount_price_bdt: r.discount_price_bdt,
    compare_at_price_bdt: r.compare_at_price_bdt,
    price_tiers: r.price_tiers,
    gift_rules: r.gift_rules,
    categorySlug: r.categories?.slug ?? null,
    image_url:
      (r.product_images ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url ?? null,
    category_id: String(r.category_id ?? ""),
    created_at: String(r.created_at ?? ""),
  };
}

export default function CategoryWiseProducts() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<(ProductCardModel & { category_id: string; created_at: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: cat, error: catErr }, { data: prods, error: prodErr }] = await Promise.all([
          supabase.from("categories").select("id, slug, name_bn, hero_rank").order("hero_rank", { ascending: false }).limit(50),
          supabase
            .from("products")
            .select("id, slug, title_bn, price_bdt, discount_price_bdt, compare_at_price_bdt, category_id, created_at, price_tiers, gift_rules, product_images(image_url, sort_order), categories(slug)")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1000),
        ]);
        if (catErr) throw catErr;
        if (prodErr) throw prodErr;

        if (ignore) return;
        setCategories((cat ?? []) as any);
        setProducts(((prods ?? []).map(mapProductRow).filter(Boolean) as any) ?? []);
      } catch (e) {
        console.error("CategoryWiseProducts load error:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const by = new Map<string, ProductCardModel[]>();
    for (const p of products) {
      const key = (p as any).category_id as string;
      if (!key) continue;
      if (!by.has(key)) by.set(key, []);
      by.get(key)!.push(p);
    }
    return by;
  }, [products]);

  const activeCategories = useMemo(() => categories.filter((c) => grouped.get(c.id)?.length), [categories, grouped]);

  return (
    <>
      <section className="container pb-12">
        <h2 className="text-xl font-semibold">ক্যাটাগরি</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {loading ? (
            <span className="text-sm text-muted-foreground">লোড হচ্ছে...</span>
          ) : activeCategories.length ? (
            activeCategories.map((c) => (
              <SiteButton key={c.slug} asChild variant="secondary" size="sm">
                <NavLink to={`/catalog/${c.slug}`}>{c.name_bn}</NavLink>
              </SiteButton>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">এখনো কোনো ক্যাটাগরিতে পণ্য নেই।</span>
          )}
        </div>
      </section>

      <section className="container pb-16">
        <div className="space-y-10">
          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">পণ্য লোড হচ্ছে...</Card>
          ) : (
            activeCategories.map((cat) => {
              const list = grouped.get(cat.id) ?? [];
              if (!list.length) return null;
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{cat.name_bn}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">এই ক্যাটাগরির সব পণ্য</p>
                    </div>
                    <SiteButton asChild variant="ghost" className="hidden sm:inline-flex">
                      <NavLink to={`/catalog/${cat.slug}`}>সব দেখুন</NavLink>
                    </SiteButton>
                  </div>
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {list.map((p) => (
                      <ProductCard key={p.id} p={p} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
