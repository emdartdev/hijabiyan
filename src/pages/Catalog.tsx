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

  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductCardModel[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParam = q.get("search") ?? "";

  usePageMeta(categorySlug ? `ক্যাটালগ | ${categorySlug}` : "ক্যাটালগ | hijabiyan.shop", "আপনার পছন্দের হিজাব ও মডেস্ট ফ্যাশন খুঁজুন।");

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
        .select("id, slug, title_bn, price_bdt, discount_price_bdt, compare_at_price_bdt, price_tiers, gift_rules, product_images(image_url, sort_order), categories(slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (categoryId) query = query.eq("category_id", categoryId);
      const s = searchParam.trim();
      if (s) query = query.ilike("title_bn", `%${s}%`);

      const { data: base } = await query;
      const baseProducts = (base ?? []).map((r: any) => ({
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
      })) as ProductCardModel[];

      if (!ignore) {
        setProducts(baseProducts);
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [categorySlug, searchParam]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{categoryName ?? "সব পণ্য"}</h1>
            {searchParam && (
              <p className="mt-1 text-sm text-muted-foreground">
                "{searchParam}" এর জন্য ফলাফল দেখাচ্ছে
              </p>
            )}
          </div>
          <SiteButton asChild variant="secondary">
            <a href="#products">পণ্য দেখুন</a>
          </SiteButton>
        </div>

        <section id="products" className="mt-8">
          {loading ? (
            <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
          ) : products.length ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
