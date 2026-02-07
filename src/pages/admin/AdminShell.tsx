import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import adminLogo from "@/assets/logo-admin.png";
import { Menu, X } from "lucide-react";

export default function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const navItems = [
    { to: "/admin", label: "ড্যাশবোর্ড" },
    { to: "/admin/orders", label: "অর্ডার" },
    { to: "/admin/categories", label: "ক্যাটাগরি" },
    { to: "/admin/products", label: "পণ্য" },
    { to: "/admin/customers", label: "কাস্টমার" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-sm font-semibold">
              <span className="flex items-center gap-2">
                <img src={adminLogo} alt="হিজাবিয়ান" className="h-8 w-auto" loading="eager" />
                <span className="sr-only">hijabiyan.shop</span>
              </span>
            </NavLink>
            <nav className="hidden sm:flex items-center gap-2 text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    ["rounded-md px-3 py-1.5 transition-colors text-xs lg:text-sm", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={logout} className="hidden xs:inline-flex">
              লগআউট
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-card py-4 sm:hidden animate-in slide-in-from-top duration-200">
            <nav className="container grid gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    ["block rounded-md px-4 py-3 text-sm font-medium transition-colors", isActive ? "bg-secondary text-primary" : "hover:bg-secondary/50"].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={logout}
                className="mt-2 block w-full rounded-md px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                লগআউট
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="container py-6 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-4 md:mt-6">{children}</div>
      </main>
    </div>
  );
}
