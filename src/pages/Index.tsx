import { useEffect, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SiteButton from "@/components/site/SiteButton";
import { Card } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { usePageMeta } from "@/hooks/use-page-meta";
import CategoryWiseProducts from "@/components/site/CategoryWiseProducts";
import { supabase } from "@/integrations/supabase/client";

type FeaturedCategory = {
  id: string;
  slug: string;
  name_bn: string;
  hero_rank: number;
};

const Index = () => {
  usePageMeta("hijabiyan.shop | হিজাব ও মডেস্ট ফ্যাশন", "বাংলাদেশে হিজাব ও মডেস্ট ফ্যাশন কিনুন—সহজ অর্ডার, COD, অর্ডার ট্র্যাকিং।");

  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, slug, name_bn, hero_rank")
          .eq("is_active", true)
          .order("hero_rank", { ascending: false })
          .limit(3);

        if (error) throw error;
        setFeaturedCategories(data ?? []);
      } catch (err) {
        console.error("Failed to load featured categories:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedCategories();
  }, []);


  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-secondary/20">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px] animate-pulse" />
            <div className="absolute top-1/2 right-0 h-72 w-72 -translate-y-1/2 rounded-full bg-accent/30 blur-[80px]" />
          </div>

          <div className="container py-16 md:py-24">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl text-foreground">
                হিজাব ও মডেস্ট ফ্যাশন—<span className="text-primary italic">বাংলাদেশজুড়ে</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground/90 leading-relaxed md:text-xl">
                Hijabiyan.shop একটি Mohima Fashion-এর প্রতিষ্ঠান। পছন্দের হিজাব, অর্না ও অ্যাক্সেসরিজ বেছে নিন—সহজ অর্ডার, ক্যাশ অন ডেলিভারি, আর অর্ডার ট্র্যাকিং।
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <SiteButton asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  <NavLink to="/catalog">শপিং শুরু করুন</NavLink>
                </SiteButton>
                <SiteButton asChild size="lg" variant="secondary" className="rounded-full px-8 backdrop-blur-sm bg-secondary/80">
                  <NavLink to="/track">অর্ডার ট্র্যাক</NavLink>
                </SiteButton>
              </div>
              <div className="mt-10 flex flex-wrap gap-3 text-xs font-medium">
                <span className="rounded-full bg-primary/10 text-primary px-4 py-1.5 border border-primary/20">COD</span>
                <span className="rounded-full bg-primary/10 text-primary px-4 py-1.5 border border-primary/20">মোবাইল ফার্স্ট</span>
                <span className="rounded-full bg-primary/10 text-primary px-4 py-1.5 border border-primary/20">দ্রুত ডেলিভারি</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-16 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">ফিচার্ড ক্যাটাগরি</h2>
              <p className="mt-2 text-muted-foreground">এক ক্লিকে আপনার পছন্দের কালেকশন দেখুন।</p>
            </div>
            <SiteButton asChild variant="ghost" className="hidden sm:inline-flex hover:bg-primary/10 hover:text-primary rounded-full group">
              <NavLink to="/catalog">সব দেখুন <span className="ml-1 transition-transform group-hover:translate-x-1">→</span></NavLink>
            </SiteButton>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {loading ? (
              <div className="col-span-2 text-center text-muted-foreground py-8">লোড হচ্ছে...</div>
            ) : featuredCategories.length === 0 ? (
              <div className="col-span-2 text-center text-muted-foreground py-8">কোনো ফিচার্ড ক্যাটাগরি নেই।</div>
            ) : (
              <>
                {featuredCategories[0] && (
                  <Card className="group relative overflow-hidden border-none bg-primary/5 hover:bg-primary/10 transition-colors duration-500 rounded-2xl">
                    <NavLink to={`/catalog/${featuredCategories[0].slug}`} className="block p-8 md:p-12">
                      <div className="text-sm font-semibold uppercase tracking-wider text-primary/70">কালেকশন</div>
                      <div className="mt-3 text-3xl font-bold tracking-tight md:text-4xl text-foreground group-hover:text-primary transition-colors">
                        {featuredCategories[0].name_bn}
                      </div>
                      <div className="mt-8 inline-flex items-center text-sm font-bold text-primary group-hover:translate-x-2 transition-transform">
                        এখনই দেখুন <span className="ml-2">→</span>
                      </div>
                      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl transition-transform duration-700 group-hover:scale-125" />
                    </NavLink>
                  </Card>
                )}

                {featuredCategories.length > 1 && (
                  <div className="grid gap-6">
                    {featuredCategories.slice(1).map((c) => (
                      <Card key={c.slug} className="group relative overflow-hidden border-none bg-secondary/50 hover:bg-secondary transition-colors duration-500 rounded-2xl">
                        <NavLink to={`/catalog/${c.slug}`} className="block p-8">
                          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">কালেকশন</div>
                          <div className="mt-2 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{c.name_bn}</div>
                          <div className="mt-4 inline-flex items-center text-sm font-bold text-primary group-hover:translate-x-2 transition-transform">
                            দেখুন <span className="ml-2">→</span>
                          </div>
                          <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-accent/40 blur-3xl transition-transform duration-700 group-hover:scale-125" />
                        </NavLink>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <CategoryWiseProducts />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
