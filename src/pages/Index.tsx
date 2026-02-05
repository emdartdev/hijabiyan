import { useMemo } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SiteButton from "@/components/site/SiteButton";
import { Card } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { usePageMeta } from "@/hooks/use-page-meta";
import HomepageCouponPopup from "@/components/site/HomepageCouponPopup";
import CategoryWiseProducts from "@/components/site/CategoryWiseProducts";

const Index = () => {
  usePageMeta("hijabiyan.shop | হিজাব ও মডেস্ট ফ্যাশন", "বাংলাদেশে হিজাব ও মডেস্ট ফ্যাশন কিনুন—সহজ অর্ডার, COD, অর্ডার ট্র্যাকিং।");

  const featuredLayout = useMemo(
    () => [
      { slug: "ready-hijab", label: "রেডি হিজাব কালেকশন" },
      { slug: "diamond-hijab", label: "ডায়মন্ড হিজাব" },
      { slug: "afgani-orna", label: "আফগানি হিজাব অর্না" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <HomepageCouponPopup />

      <main>
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/70 blur-3xl" />
            <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-secondary/80 blur-3xl" />
          </div>

          <div className="container py-14 md:py-20">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">হিজাব ও মডেস্ট ফ্যাশন—বাংলাদেশজুড়ে</h1>
              <p className="mt-4 text-base text-muted-foreground md:text-lg">
                পছন্দের হিজাব, অর্না ও অ্যাক্সেসরিজ বেছে নিন—সহজ অর্ডার, ক্যাশ অন ডেলিভারি, আর অর্ডার ট্র্যাকিং।
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <SiteButton asChild size="lg">
                  <NavLink to="/catalog">শপিং শুরু করুন</NavLink>
                </SiteButton>
                <SiteButton asChild size="lg" variant="secondary">
                  <NavLink to="/track">অর্ডার ট্র্যাক</NavLink>
                </SiteButton>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1">COD</span>
                <span className="rounded-full bg-secondary px-3 py-1">মোবাইল ফার্স্ট</span>
                <span className="rounded-full bg-secondary px-3 py-1">দ্রুত ডেলিভারি</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-10 md:py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">ফিচার্ড ক্যাটাগরি</h2>
              <p className="mt-1 text-sm text-muted-foreground">এক ক্লিকে আপনার পছন্দের কালেকশন দেখুন।</p>
            </div>
            <SiteButton asChild variant="ghost" className="hidden sm:inline-flex">
              <NavLink to="/catalog">সব দেখুন</NavLink>
            </SiteButton>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="group relative overflow-hidden border bg-card">
              <NavLink to={`/catalog/${featuredLayout[0].slug}`} className="block p-6 md:p-10">
                <div className="text-sm text-muted-foreground">কালেকশন</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{featuredLayout[0].label}</div>
                <div className="mt-6 inline-flex items-center text-sm font-medium text-primary">এখনই দেখুন →</div>
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/60 blur-2xl transition-transform group-hover:scale-110" />
              </NavLink>
            </Card>

            <div className="grid gap-4">
              {featuredLayout.slice(1).map((c) => (
                <Card key={c.slug} className="group relative overflow-hidden border bg-card">
                  <NavLink to={`/catalog/${c.slug}`} className="block p-6">
                    <div className="text-sm text-muted-foreground">কালেকশন</div>
                    <div className="mt-2 text-xl font-semibold">{c.label}</div>
                    <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">দেখুন →</div>
                    <div className="pointer-events-none absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-secondary/60 blur-2xl transition-transform group-hover:scale-110" />
                  </NavLink>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <CategoryWiseProducts />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
