import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/pages/admin/AdminShell";
import { useAdminGuard } from "@/pages/admin/useAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { convertDriveUrl } from "@/lib/image-utils";

type CategoryRow = {
  id: string;
  name_bn: string;
  slug: string;
  description_bn: string | null;
  parent_id: string | null;
  image_url: string | null;
  seo_title_bn: string | null;
  seo_description_bn: string | null;
  is_active: boolean;
  hero_rank: number;
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

export default function AdminCategories() {
  usePageMeta("অ্যাডমিন | ক্যাটাগরি", "ক্যাটাগরি যোগ/এডিট, parent/subcategory, SEO");

  const guard = useAdminGuard();
  const { toast } = useToast();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [form, setForm] = useState<Partial<CategoryRow>>({
    name_bn: "",
    slug: "",
    description_bn: null,
    parent_id: null,
    image_url: null,
    seo_title_bn: null,
    seo_description_bn: null,
    is_active: true,
    hero_rank: 0,
  });

  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => categories.find((c) => c.id === selectedId) ?? null, [categories, selectedId]);

  useEffect(() => {
    if (!guard.isAdmin) return;
    loadCategories();
  }, [guard.isAdmin]);

  useEffect(() => {
    if (selectedId) {
      const cat = categories.find((c) => c.id === selectedId);
      if (cat) {
        setForm(cat);
        setIsNew(false);
      }
    }
  }, [selectedId, categories]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("categories").select("*").order("hero_rank", { ascending: false });
      if (error) throw error;
      setCategories(data ?? []);
    } catch (err) {
      console.error("Load categories error:", err);
      toast({ title: "লোড ব্যর্থ", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setIsNew(true);
    setSelectedId(null);
    setForm({
      name_bn: "",
      slug: "",
      description_bn: null,
      parent_id: null,
      image_url: null,
      seo_title_bn: null,
      seo_description_bn: null,
      is_active: true,
      hero_rank: 0,
    });
  };

  const handleSave = async () => {
    if (!form.name_bn?.trim()) {
      toast({ title: "ক্যাটাগরি নাম দিতে হবে", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name_bn: form.name_bn.trim(),
        slug: form.slug?.trim() || slugifyBnLike(form.name_bn),
        description_bn: form.description_bn?.trim() || null,
        parent_id: form.parent_id || null,
        image_url: form.image_url?.trim() ? convertDriveUrl(form.image_url.trim()) : null,
        seo_title_bn: form.seo_title_bn?.trim() || null,
        seo_description_bn: form.seo_description_bn?.trim() || null,
        is_active: form.is_active ?? true,
        hero_rank: form.hero_rank ?? 0,
      };

      if (isNew) {
        const { error } = await supabase.from("categories").insert([payload]);
        if (error) throw error;
        toast({ title: "ক্যাটাগরি যোগ হয়েছে" });
      } else if (selectedId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", selectedId);
        if (error) throw error;
        toast({ title: "ক্যাটাগরি আপডেট হয়েছে" });
      }

      await loadCategories();
      setIsNew(false);
      setSelectedId(null);
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "সেভ ব্যর্থ", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !selectedId) return;
    const msg = `"${selected.name_bn}" ডিলিট করবেন?\n\nএটি ডিলিট করলে এই ক্যাটাগরির সব পণ্য "Uncategorized" হয়ে যাবে। সাব-ক্যাটাগরিগুলো মেইন ক্যাটাগরি হয়ে যাবে।`;
    if (!confirm(msg)) return;

    setBusy(true);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", selectedId);
      if (error) throw error;
      toast({ title: "ক্যাটাগরি মুছে গেছে" });
      await loadCategories();
      setSelectedId(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "মুছা ব্যর্থ", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name_bn.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [categories, search]);

  const rootCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  if (guard.loading || !guard.isAdmin) return null;

  return (
    <AdminShell title="ক্যাটাগরি ম্যানেজমেন্ট">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="ক্যাটাগরি নাম/slug খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={handleNew}>নতুন ক্যাটাগরি</Button>
          <Button variant="outline" onClick={() => loadCategories()}>
            রিফ্রেশ
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">লোড হচ্ছে...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">কোনো ক্যাটাগরি নেই।</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cat) => (
              <Card key={cat.id} className="cursor-pointer hover:border-primary" onClick={() => setSelectedId(cat.id)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{cat.name_bn}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="text-muted-foreground">slug: {cat.slug}</p>
                  {cat.parent_id && (
                    <p className="text-muted-foreground">
                      Parent: {categories.find((c) => c.id === cat.parent_id)?.name_bn ?? "?"}
                    </p>
                  )}
                  <p className={cat.is_active ? "text-green-600" : "text-muted-foreground"}>
                    {cat.is_active ? "প্রদর্শিত" : "লুকানো"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Category Edit Dialog */}
      <Dialog open={isNew || !!selectedId} onOpenChange={(open) => !open && (setIsNew(false), setSelectedId(null))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "নতুন ক্যাটাগরি" : `এডিট: ${selected?.name_bn}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name_bn">ক্যাটাগরি নাম (বাংলা)</Label>
              <Input
                id="name_bn"
                value={form.name_bn ?? ""}
                onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                placeholder="ক্যাটাগরি নাম..."
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug (URL-friendly)</Label>
              <Input
                id="slug"
                value={form.slug ?? ""}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generate from name"
              />
            </div>

            <div>
              <Label htmlFor="description_bn">বর্ণনা (বাংলা)</Label>
              <Textarea
                id="description_bn"
                value={form.description_bn ?? ""}
                onChange={(e) => setForm({ ...form, description_bn: e.target.value })}
                rows={2}
                placeholder="ক্যাটাগরি বর্ণনা..."
              />
            </div>

            <div>
              <Label htmlFor="parent_id">Parent Category (subcategory তৈরির জন্য)</Label>
              <Select
                value={form.parent_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? null : v })}
              >
                <SelectTrigger id="parent_id">
                  <SelectValue placeholder="None (root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root)</SelectItem>
                  {rootCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_bn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image_url">ছবি URL</Label>
              <Input
                id="image_url"
                value={form.image_url ?? ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="seo_title_bn">SEO Title (বাংলা)</Label>
              <Input
                id="seo_title_bn"
                value={form.seo_title_bn ?? ""}
                onChange={(e) => setForm({ ...form, seo_title_bn: e.target.value })}
                placeholder="SEO title..."
              />
            </div>

            <div>
              <Label htmlFor="seo_description_bn">SEO Description (বাংলা)</Label>
              <Textarea
                id="seo_description_bn"
                value={form.seo_description_bn ?? ""}
                onChange={(e) => setForm({ ...form, seo_description_bn: e.target.value })}
                rows={2}
                placeholder="SEO description..."
              />
            </div>

            <div>
              <Label htmlFor="hero_rank">Hero Rank (বড় হলে উপরে)</Label>
              <Input
                id="hero_rank"
                type="number"
                value={form.hero_rank ?? 0}
                onChange={(e) => setForm({ ...form, hero_rank: parseInt(e.target.value, 10) || 0 })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active ?? true}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">প্রদর্শিত (Visible)</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => (setIsNew(false), setSelectedId(null))} disabled={busy}>
                বাতিল
              </Button>
              {!isNew && (
                <Button variant="destructive" onClick={handleDelete} disabled={busy}>
                  মুছুন
                </Button>
              )}
              <Button onClick={handleSave} disabled={busy}>
                {busy ? "সেভ হচ্ছে..." : "সেভ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}