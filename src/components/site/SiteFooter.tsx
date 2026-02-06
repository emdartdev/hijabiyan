import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SiteFooter() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        if (mounted) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (!mounted) return;
      setIsAdmin(!error && data === true);
    };

    checkAdmin();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <footer className="border-t bg-background">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <img src={logo} alt="হিজাবিয়ান" className="h-12 w-auto" loading="lazy" />
            <p className="mt-2 text-sm text-muted-foreground">
              বাংলাদেশে সাশ্রয়ী দামে হিজাব ও মডেস্ট ফ্যাশন—সহজ অর্ডার, ক্যাশ অন ডেলিভারি। Hijabiyan একটি Mohima Fashion-এর প্রতিষ্ঠান।
            </p>
          </div>

          <div className="text-sm">
            <div className="font-medium">পেজসমূহ</div>
            <div className="mt-2 grid gap-2">
              <NavLink to="/about" className="text-muted-foreground hover:text-foreground">
                আমাদের সম্পর্কে
              </NavLink>
              <NavLink to="/privacy" className="text-muted-foreground hover:text-foreground">
                প্রাইভেসি পলিসি
              </NavLink>
              <NavLink to="/returns" className="text-muted-foreground hover:text-foreground">
                রিটার্ন ও রিফান্ড
              </NavLink>
              <NavLink to="/terms" className="text-muted-foreground hover:text-foreground">
                শর্তাবলী
              </NavLink>
            </div>
          </div>

          <div className="text-sm">
            <div className="font-medium">সাপোর্ট</div>
            <p className="mt-2 text-muted-foreground">অর্ডার ট্র্যাক করতে “ট্র্যাক অর্ডার” ব্যবহার করুন।</p>

            <div className="mt-4">
              <NavLink
                to={isAdmin ? "/admin" : "/admin/login?redirect=%2Fadmin"}
                className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs text-foreground shadow-sm transition hover:bg-accent/30"
                aria-label="অ্যাডমিন ড্যাশবোর্ড"
                title={isAdmin ? "অ্যাডমিন ড্যাশবোর্ড" : "অ্যাডমিন লগইন"}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </NavLink>
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-muted-foreground">© {new Date().getFullYear()} hijabiyan.shop</div>
      </div>
    </footer>
  );
}


