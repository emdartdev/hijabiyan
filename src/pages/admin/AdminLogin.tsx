import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminLogin() {
  usePageMeta("অ্যাডমিন লগইন | hijabiyan.shop", "Super Admin লগইন করে পণ্য ম্যানেজ করুন।");

  const { toast } = useToast();
  const navigate = useNavigate();
  const q = useQuery();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const redirect = q.get("redirect") || "/admin/products";

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user?.id) navigate(redirect, { replace: true });
    };
    init();
    return () => {
      mounted = false;
    };
  }, [navigate, redirect]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("লগইন হয়নি। আবার চেষ্টা করুন।");

      const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (roleErr || isAdmin !== true) {
        await supabase.auth.signOut();
        throw new Error("আপনার অ্যাডমিন অ্যাক্সেস নেই।");
      }

      navigate(redirect, { replace: true });
    } catch (err: any) {
      toast({ title: "লগইন ব্যর্থ", description: err?.message ?? "আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-12">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">অ্যাডমিন লগইন</h1>
          <p className="mt-1 text-sm text-muted-foreground">শুধু Super Admin অ্যাক্সেস।</p>

          <Card className="mt-6 p-5">
            <form className="grid gap-4" onSubmit={signIn}>
              <div>
                <label className="text-xs text-muted-foreground">ইমেইল</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" inputMode="email" autoComplete="email" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">পাসওয়ার্ড</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "লগইন হচ্ছে..." : "লগইন"}
              </Button>
            </form>
          </Card>

        </div>
      </main>
    </div>
  );
}
