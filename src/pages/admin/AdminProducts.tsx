import { useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/pages/admin/AdminShell";
import { useAdminGuard } from "@/pages/admin/useAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { formatBDT } from "@/lib/money";
import { usePageMeta } from "@/hooks/use-page-meta";
import { forwardRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Upload, Image as ImageIcon } from "lucide-react";
import { convertDriveUrl } from "@/lib/image-utils";

type AdminProductRow = {
  id: string;
  title_bn: string;
  slug: string;
  sku: string | null;
  price_bdt: number;
  discount_price_bdt: number | null;
  is_active: boolean;
  category_id: string | null;
  description_bn: string | null;
  care_instructions_bn: string | null;
  delivery_notes_bn: string | null;
  compare_at_price_bdt: number | null;
};

type CategoryRow = { id: string; name_bn: string; slug: string };

type VariantRow = {
  id: string;
  product_id: string;
  color_bn: string | null;
  color_hex: string | null;
  size_bn: string | null;
  price_bdt: number | null;
  stock_qty: number;
  image_url: string | null;
  is_active: boolean;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt_bn: string | null;
  sort_order: number;
};

function slugifyBnLike(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSku() {
  return `HJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export default function AdminProducts() {
  usePageMeta("অ্যাডমিন | পণ্য", "পণ্য যোগ/এডিট, ভ্যারিয়েন্ট ও ছবি ম্যানেজ করুন।");

  const guard = useAdminGuard();
  const { toast } = useToast();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => products.find((p) => p.id === selectedId) ?? null, [products, selectedId]);

  const [form, setForm] = useState<Partial<AdminProductRow>>({
    title_bn: "",
    slug: "",
    sku: null,
    category_id: null,
    price_bdt: 0,
    discount_price_bdt: null,
    compare_at_price_bdt: null,
    is_active: true,
    description_bn: null,
    care_instructions_bn: null,
    delivery_notes_bn: null,
  });

  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [busy, setBusy] = useState(false);

  // Debounce variant updates so typing doesn't cause flicker (reloading data on every keystroke).
  const variantUpdateTimersRef = useRef<Record<string, number>>({});

  // Generate category-based numbered slug
  const generateCategorySlug = (categoryId: string | null): string => {
    // Get category slug
    const category = categories.find(c => c.id === categoryId);
    const categorySlug = category?.slug ?? 'product';
    
    // Find highest number for this category
    const categoryProducts = products.filter(p => 
      p.slug.startsWith(`${categorySlug}-`) && p.id !== form.id
    );
    
    let maxNumber = 0;
    categoryProducts.forEach(p => {
      const match = p.slug.match(new RegExp(`^${categorySlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    return `${categorySlug}-${maxNumber + 1}`;
  };

  const initialLoadDone = useRef(false);

  const loadBase = async () => {
    setLoading(true);
    try {
      const [{ data: cats, error: catErr }, { data: prods, error: prodErr }] = await Promise.all([
        supabase.from("categories").select("id, name_bn, slug").order("hero_rank", { ascending: false }).limit(200),
        supabase
          .from("products")
          .select(
            "id, title_bn, slug, sku, price_bdt, discount_price_bdt, compare_at_price_bdt, is_active, category_id, description_bn, care_instructions_bn, delivery_notes_bn",
          )
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      if (catErr) throw catErr;
      if (prodErr) throw prodErr;
      setCategories(cats ?? []);
      setProducts((prods ?? []) as any);
      
      // Only auto-select first product on the very first load
      if (!initialLoadDone.current && !selectedId && (prods ?? []).length) {
        setSelectedId((prods ?? [])[0].id);
        initialLoadDone.current = true;
      }
    } catch (e: any) {
      toast({ title: "লোড করা যায়নি", description: e?.message ?? "আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (productId: string) => {
    const [{ data: vars, error: vErr }, { data: imgs, error: iErr }] = await Promise.all([
      supabase
        .from("product_variants")
        .select("id, product_id, color_bn, color_hex, size_bn, price_bdt, stock_qty, image_url, is_active")
        .eq("product_id", productId)
        .order("created_at", { ascending: true }),
      supabase
        .from("product_images")
        .select("id, product_id, image_url, alt_bn, sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true }),
    ]);
    if (vErr) throw vErr;
    if (iErr) throw iErr;
    setVariants((vars ?? []) as any);
    setImages((imgs ?? []) as any);
  };

  useEffect(() => {
    if (!guard.loading && guard.isAdmin) loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.loading, guard.isAdmin]);

  useEffect(() => {
    if (!selected) return;
    setForm({
      id: selected.id,
      title_bn: selected.title_bn,
      slug: selected.slug,
      sku: selected.sku,
      category_id: selected.category_id,
      price_bdt: selected.price_bdt,
      discount_price_bdt: selected.discount_price_bdt,
      compare_at_price_bdt: selected.compare_at_price_bdt,
      is_active: selected.is_active,
      description_bn: selected.description_bn,
      care_instructions_bn: selected.care_instructions_bn,
      delivery_notes_bn: selected.delivery_notes_bn,
    });
    loadDetails(selected.id).catch((e) => toast({ title: "ডিটেইল লোড হয়নি", description: e?.message ?? "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filtered = useMemo(() => {
    const s = search.trim();
    if (!s) return products;
    return products.filter((p) => (p.title_bn ?? "").includes(s) || (p.slug ?? "").includes(s) || (p.sku ?? "").includes(s));
  }, [products, search]);

  const setField = <K extends keyof AdminProductRow>(key: K, value: AdminProductRow[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const newProduct = () => {
    setSelectedId(null);
    setVariants([]);
    setImages([]);
    const initialCategoryId = categories[0]?.id ?? null;
    const initialSlug = generateCategorySlug(initialCategoryId);
    
    setForm({
      title_bn: "",
      slug: initialSlug,
      sku: randomSku(),
      category_id: initialCategoryId,
      price_bdt: 0,
      discount_price_bdt: null,
      compare_at_price_bdt: null,
      is_active: true,
      description_bn: null,
      care_instructions_bn: null,
      delivery_notes_bn: null,
    });
  };

  const saveProduct = async () => {
    const title = (form.title_bn ?? "").trim();
    const slug = (form.slug ?? "").trim();
    const categoryId = (form.category_id ?? "").trim();
    const sku = (form.sku ?? "").trim() || null;
    const price = Number(form.price_bdt ?? 0);
    const discount = form.discount_price_bdt === null || form.discount_price_bdt === undefined || form.discount_price_bdt === ("" as any) ? null : Number(form.discount_price_bdt);
    const compareAt =
      form.compare_at_price_bdt === null || form.compare_at_price_bdt === undefined || form.compare_at_price_bdt === ("" as any)
        ? null
        : Number(form.compare_at_price_bdt);

    if (!title) {
      toast({ title: "নাম দিন", description: "Product Name (বাংলা) ফাঁকা রাখা যাবে না।" });
      return;
    }
    // Category is now optional, but recommended.
    // if (!categoryId) { ... } 

    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "দাম ভুল", description: "Price সঠিক দিন।" });
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title_bn: title,
        slug,
        sku,
        category_id: categoryId,
        price_bdt: price,
        discount_price_bdt: discount,
        compare_at_price_bdt: compareAt,
        is_active: !!form.is_active,
        description_bn: (form.description_bn ?? "")?.trim() || null,
        care_instructions_bn: (form.care_instructions_bn ?? "")?.trim() || null,
        delivery_notes_bn: (form.delivery_notes_bn ?? "")?.trim() || null,
      };

      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id);
        if (error) throw error;
        toast({ title: "সেভ হয়েছে", description: "পণ্য আপডেট করা হয়েছে।" });
      } else {
        const { data, error } = await supabase.from("products").insert(payload as any).select("id").single();
        if (error) throw error;
        toast({ title: "সেভ হয়েছে", description: "নতুন পণ্য যোগ করা হয়েছে।" });
        setSelectedId(data.id);
      }

      await loadBase();
    } catch (e: any) {
      toast({ title: "সেভ হয়নি", description: e?.message ?? "আবার চেষ্টা করুন।" });
    } finally {
      setBusy(false);
    }
  };

  const addVariant = async () => {
    if (!selectedId && !form.id) {
      toast({ title: "আগে পণ্য সেভ করুন", description: "ভ্যারিয়েন্ট যোগ করার আগে পণ্যটি সেভ করতে হবে।" });
      return;
    }
    const productId = (form.id ?? selectedId) as string;
    setBusy(true);
    try {
      const { error } = await supabase.from("product_variants").insert({ product_id: productId, stock_qty: 0, is_active: true } as any);
      if (error) throw error;
      await loadDetails(productId);
    } catch (e: any) {
      toast({ title: "ভ্যারিয়েন্ট যোগ হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const updateVariantNow = async (id: string, patch: Partial<VariantRow>) => {
    try {
      const { error } = await supabase.from("product_variants").update(patch as any).eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "ভ্যারিয়েন্ট আপডেট হয়নি", description: e?.message ?? "" });
      // If backend update fails, refresh from DB to keep UI consistent.
      const productId = (form.id ?? selectedId) as string;
      if (productId) loadDetails(productId).catch(() => undefined);
    }
  };

  const updateVariant = (id: string, patch: Partial<VariantRow>) => {
    // Optimistic local update
    const finalPatch = { ...patch };
    if (patch.image_url) {
      finalPatch.image_url = convertDriveUrl(patch.image_url);
    }
    setVariants((prev) => prev.map((v) => (v.id === id ? ({ ...v, ...finalPatch } as VariantRow) : v)));

    // Debounced backend update
    const prevTimer = variantUpdateTimersRef.current[id];
    if (prevTimer) window.clearTimeout(prevTimer);
    variantUpdateTimersRef.current[id] = window.setTimeout(() => {
      updateVariantNow(id, finalPatch);
    }, 500);
  };

  const deleteProduct = async () => {
    if (!form.id || !confirm("এই পণ্যটি ডিলিট করবেন? রিভার্ট করা যাবে না।")) return;
    setBusy(true);
    try {
      // Use the RPC function in case there are dependencies (or use our logic)
      // The user wants to use a DB function. We try that first.
      const { error } = await supabase.rpc("delete_product_safe" as any, { p_product_id: form.id });
      if (error) throw error;

      toast({ title: "পণ্য ডিলিট হয়েছে" });

      // Optimistic update
      setProducts((prev) => prev.filter((p) => p.id !== form.id));

      // Cleanup
      setSelectedId(null);
      setForm({
        title_bn: "",
        slug: "",
        sku: randomSku(),
        category_id: categories[0]?.id ?? null,
        price_bdt: 0,
        discount_price_bdt: null,
        compare_at_price_bdt: null,
        is_active: true,
        description_bn: null,
        care_instructions_bn: null,
        delivery_notes_bn: null,
      });
      setVariants([]);
      setImages([]);

    } catch (e: any) {
      console.error("Delete failed", e);
      toast({ title: "ডিলিট হয়নি", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const deleteVariant = async (id: string) => {
    const productId = (form.id ?? selectedId) as string;
    setBusy(true);
    try {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
      await loadDetails(productId);
    } catch (e: any) {
      toast({ title: "ডিলিট হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const addImageFromUrl = async (url: string) => {
    const productId = (form.id ?? selectedId) as string;
    const clean = convertDriveUrl(url.trim());
    if (!clean) return;
    setBusy(true);
    try {
      const nextSort = (images[images.length - 1]?.sort_order ?? -1) + 1;
      const { error } = await supabase.from("product_images").insert({ product_id: productId, image_url: clean, sort_order: nextSort } as any);
      if (error) throw error;
      await loadDetails(productId);
    } catch (e: any) {
      toast({ title: "ছবি যোগ হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    const productId = (form.id ?? selectedId) as string;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      if (!publicUrl) throw new Error("Public URL পাওয়া যায়নি");

      const nextSort = (images[images.length - 1]?.sort_order ?? -1) + 1;
      const { error: insErr } = await supabase.from("product_images").insert({ product_id: productId, image_url: publicUrl, sort_order: nextSort } as any);
      if (insErr) throw insErr;

      await loadDetails(productId);
    } catch (e: any) {
      toast({ title: "আপলোড হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const uploadVariantImage = async (variantId: string, file: File) => {
    const productId = (form.id ?? selectedId) as string;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${productId}/v-${variantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      if (!publicUrl) throw new Error("Public URL পাওয়া যায়নি");

      // Update the variant record
      const { error: upvErr } = await supabase
        .from("product_variants")
        .update({ image_url: publicUrl } as any)
        .eq("id", variantId);
      if (upvErr) throw upvErr;

      await loadDetails(productId);
      toast({ title: "আপলোড হয়েছে", description: "ভ্যারিয়েন্ট ছবি আপডেট করা হয়েছে।" });
    } catch (e: any) {
      toast({ title: "আপলোড হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const moveImage = async (imageId: string, dir: "up" | "down") => {
    const productId = (form.id ?? selectedId) as string;
    const idx = images.findIndex((im) => im.id === imageId);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= images.length) return;
    const a = images[idx];
    const b = images[swapWith];

    setBusy(true);
    try {
      const { error: e1 } = await supabase.from("product_images").update({ sort_order: b.sort_order } as any).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("product_images").update({ sort_order: a.sort_order } as any).eq("id", b.id);
      if (e2) throw e2;
      await loadDetails(productId);
    } catch (e: any) {
      toast({ title: "রিঅর্ডার হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    const productId = (form.id ?? selectedId) as string;
    setBusy(true);
    try {
      const { error } = await supabase.from("product_images").delete().eq("id", imageId);
      if (error) throw error;
      await loadDetails(productId);
    } catch (e: any) {
      toast({ title: "ডিলিট হয়নি", description: e?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (product: AdminProductRow, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    const newStatus = !product.is_active;

    // Optimistic update
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p)));
    if (selectedId === product.id) {
      setForm((f) => ({ ...f, is_active: newStatus }));
    }

    try {
      const { error } = await supabase.from("products").update({ is_active: newStatus }).eq("id", product.id);
      if (error) throw error;
      toast({ title: newStatus ? "পণ্য পাবলিশ হয়েছে" : "পণ্য হাইড করা হয়েছে" });
    } catch (err: any) {
      console.error("Toggle error:", err);
      toast({ title: "আপডেট হয়নি", description: err.message, variant: "destructive" });
      // Revert on error
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: !newStatus } : p)));
      if (selectedId === product.id) {
        setForm((f) => ({ ...f, is_active: !newStatus }));
      }
    }
  };

  if (guard.loading) return <AdminShell title="পণ্য"><div className="text-sm text-muted-foreground">লোড হচ্ছে...</div></AdminShell>;
  if (!guard.isAdmin) return null;

  return (
    <AdminShell title="পণ্য ম্যানেজমেন্ট">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="order-2 lg:order-1">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">পণ্য তালিকা</div>
              <Button size="sm" onClick={() => {
                newProduct();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>
                নতুন পণ্য
              </Button>
            </div>
            <div className="mt-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="সার্চ (নাম/slug/sku)" />
            </div>
            <div className="mt-4 grid gap-2 max-h-[500px] lg:max-h-[600px] overflow-auto pr-1">
              {loading ? (
                <div className="text-sm text-muted-foreground">লোড হচ্ছে...</div>
              ) : filtered.length ? (
                filtered.map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(p.id);
                        if (window.innerWidth < 1024) {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={[
                        "w-full rounded-md border p-3 text-left transition-colors flex items-center justify-between gap-3",
                        active ? "bg-secondary" : "bg-card hover:bg-secondary/40",
                      ].join(" ")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.title_bn}</div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                          <span>/{p.slug}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs font-semibold">{formatBDT(p.discount_price_bdt ?? p.price_bdt)}</span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={p.is_active}
                            onCheckedChange={() => toggleStatus(p, { stopPropagation: () => { } } as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">কোনো পণ্য নেই।</div>
              )}
            </div>
          </Card>
        </aside>

        <section className="order-1 lg:order-2 space-y-6">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">এডিটর</div>
                <div className="text-base sm:text-lg font-semibold">{form.id ? "পণ্য আপডেট" : "নতুন পণ্য"}</div>
              </div>
              <div className="flex gap-2">
                {form.id && (
                  <Button variant="destructive" size="sm" onClick={deleteProduct} disabled={busy}>
                    ডিলিট
                  </Button>
                )}
                <Button size="sm" onClick={saveProduct} disabled={busy}>
                  {busy ? "সেভ হচ্ছে..." : "সেভ"}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">পণ্যের নাম (বাংলা)</label>
                <Input
                  value={form.title_bn ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setField("title_bn", v as any);
                    
                    // Only auto-generate slug for new products
                    if (!form.id) {
                      const newSlug = generateCategorySlug(form.category_id ?? null);
                      setField("slug", newSlug as any);
                    }
                    
                    if (!(form.sku ?? "")?.trim()) setField("sku", randomSku() as any);
                  }}
                  placeholder="যেমন: ডায়মন্ড হিজাব"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">SKU</label>
                <Input value={form.sku ?? ""} onChange={(e) => setField("sku", e.target.value as any)} placeholder="HJ-XXXXXX" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">ক্যাটাগরি</label>
                <select
                  value={form.category_id ?? "none"}
                  onChange={(e) => {
                    const newCategoryId = e.target.value === "none" ? null : e.target.value;
                    setField("category_id", newCategoryId as any);
                    
                    // Only regenerate slug for new products
                    if (!form.id) {
                      const newSlug = generateCategorySlug(newCategoryId);
                      setField("slug", newSlug as any);
                    }
                  }}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="none">ক্যাটাগরি নেই (Uncategorized)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_bn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">দাম</label>
                <Input value={String(form.price_bdt ?? 0)} onChange={(e) => setField("price_bdt", Number(e.target.value) as any)} inputMode="numeric" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">ডিসকাউন্ট দাম (ঐচ্ছিক)</label>
                <Input
                  value={form.discount_price_bdt === null || form.discount_price_bdt === undefined ? "" : String(form.discount_price_bdt)}
                  onChange={(e) => setField("discount_price_bdt", e.target.value === "" ? (null as any) : (Number(e.target.value) as any))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Compare-at দাম (ঐচ্ছিক)</label>
                <Input
                  value={form.compare_at_price_bdt === null || form.compare_at_price_bdt === undefined ? "" : String(form.compare_at_price_bdt)}
                  onChange={(e) => setField("compare_at_price_bdt", e.target.value === "" ? (null as any) : (Number(e.target.value) as any))}
                  inputMode="numeric"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setField("is_active", e.target.checked as any)}
                  className="h-4 w-4"
                />
                <label htmlFor="is_active" className="text-sm">
                  Active (স্টোরে দেখাবে)
                </label>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-xs text-muted-foreground">বর্ণনা</label>
                <Textarea value={form.description_bn ?? ""} onChange={(e) => setField("description_bn", e.target.value as any)} rows={5} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Care Instructions</label>
                  <Textarea value={form.care_instructions_bn ?? ""} onChange={(e) => setField("care_instructions_bn", e.target.value as any)} rows={4} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Delivery Notes</label>
                  <Textarea value={form.delivery_notes_bn ?? ""} onChange={(e) => setField("delivery_notes_bn", e.target.value as any)} rows={4} />
                </div>
              </div>
            </div>
          </Card >

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm text-muted-foreground">ভ্যারিয়েন্ট</div>
                <div className="text-lg font-semibold">রং / সাইজ / স্টক</div>
              </div>
              <Button variant="secondary" onClick={addVariant} disabled={busy || !(form.id ?? selectedId)}>
                ভ্যারিয়েন্ট যোগ করুন
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              {!variants.length ? (
                <div className="text-sm text-muted-foreground">এখনো ভ্যারিয়েন্ট নেই।</div>
              ) : (
                variants.map((v) => (
                  <div key={v.id} className="rounded-md border bg-card p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_140px_1fr_110px]">
                      <div>
                        <label className="text-xs text-muted-foreground">রং</label>
                        <Input value={v.color_bn ?? ""} onChange={(e) => updateVariant(v.id, { color_bn: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Color Hex</label>
                        <Input value={v.color_hex ?? ""} onChange={(e) => updateVariant(v.id, { color_hex: e.target.value })} placeholder="#000000" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">সাইজ</label>
                        <Input value={v.size_bn ?? ""} onChange={(e) => updateVariant(v.id, { size_bn: e.target.value })} placeholder="Free / S / M..." />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">ভ্যারিয়েন্ট দাম (ঐচ্ছিক)</label>
                        <Input
                          value={v.price_bdt === null || v.price_bdt === undefined ? "" : String(v.price_bdt)}
                          onChange={(e) => updateVariant(v.id, { price_bdt: e.target.value === "" ? null : Number(e.target.value) })}
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">স্টক</label>
                        <Input value={String(v.stock_qty ?? 0)} onChange={(e) => updateVariant(v.id, { stock_qty: Number(e.target.value) })} inputMode="numeric" />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_140px_110px]">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">ভ্যারিয়েন্ট ছবি (URL বা আপলোড)</label>
                          <div className="flex gap-2">
                            <Input value={v.image_url ?? ""} onChange={(e) => updateVariant(v.id, { image_url: e.target.value })} placeholder="https://..." />
                            <div className="relative">
                              <Button variant="secondary" size="icon" className="shrink-0" asChild disabled={busy}>
                                <label className="cursor-pointer">
                                  <Upload className="h-4 w-4" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) uploadVariantImage(v.id, f);
                                    }}
                                    disabled={busy}
                                  />
                                </label>
                              </Button>
                            </div>
                          </div>
                        </div>
                        {v.image_url && (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted mb-0.5">
                            <img src={v.image_url} alt="Variant" className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          id={`v_active_${v.id}`}
                          type="checkbox"
                          checked={!!v.is_active}
                          onChange={(e) => updateVariant(v.id, { is_active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`v_active_${v.id}`} className="text-sm">
                          Active
                        </label>
                      </div>
                      <div className="flex items-end justify-end">
                        <Button variant="destructive" size="sm" onClick={() => deleteVariant(v.id)} disabled={busy}>
                          ডিলিট
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm text-muted-foreground">মিডিয়া</div>
            <div className="text-lg font-semibold">পণ্যের ছবি</div>
            <p className="mt-1 text-sm text-muted-foreground">Google Drive/URL পেস্ট করুন অথবা লোকাল ফাইল আপলোড করুন।</p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Card className="p-4">
                <div className="text-sm font-medium">URL থেকে যোগ করুন</div>
                <UrlAdd onAdd={addImageFromUrl} disabled={busy || !(form.id ?? selectedId)} />
              </Card>
              <Card className="p-4">
                <div className="text-sm font-medium">লোকাল আপলোড</div>
                <FileAdd onFile={uploadImageFile} disabled={busy || !(form.id ?? selectedId)} />
              </Card>
            </div>

            <div className="mt-4 grid gap-3">
              {!images.length ? (
                <div className="text-sm text-muted-foreground">এখনো কোনো ছবি নেই।</div>
              ) : (
                images.map((im, idx) => (
                  <div key={im.id} className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-md border bg-muted">
                        <img src={im.image_url} alt={im.alt_bn ?? form.title_bn ?? "পণ্যের ছবি"} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">ছবি {idx + 1}</div>
                        <div className="mt-1 max-w-[52ch] truncate text-xs text-muted-foreground">{im.image_url}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => moveImage(im.id, "up")} disabled={busy || idx === 0}>
                        উপরে
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => moveImage(im.id, "down")} disabled={busy || idx === images.length - 1}>
                        নিচে
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteImage(im.id)} disabled={busy}>
                        ডিলিট
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section >
      </div >
    </AdminShell >
  );
}

const UrlAdd = forwardRef<HTMLFormElement, { onAdd: (url: string) => void; disabled: boolean }>(
  function UrlAdd({ onAdd, disabled }, ref) {
    const [url, setUrl] = useState("");
    return (
      <form
        ref={ref}
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(url);
          setUrl("");
        }}
      >
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." disabled={disabled} />
        <Button type="submit" disabled={disabled}>
          যোগ
        </Button>
      </form>
    );
  }
);

const FileAdd = forwardRef<HTMLDivElement, { onFile: (file: File) => void; disabled: boolean }>(
  function FileAdd({ onFile, disabled }, ref) {
    return (
      <div ref={ref} className="mt-3">
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.currentTarget.value = "";
          }}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="mt-2 text-xs text-muted-foreground">আপলোড করা ছবি Supabase Storage (product-images) এ যাবে।</p>
      </div>
    );
  }
);
