import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import adminLogo from "@/assets/logo-admin.png";

export default function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-sm font-semibold">
              <span className="flex items-center gap-2">
                <img src={adminLogo} alt="হিজাবিয়ান" className="h-8 w-auto" loading="eager" />
                <span className="sr-only">hijabiyan.shop</span>
              </span>
            </NavLink>
            <nav className="hidden sm:flex items-center gap-2 text-sm">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  ["rounded-md px-3 py-1.5 transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                }
              >
                ড্যাশবোর্ড
              </NavLink>
              <NavLink
                to="/admin/orders"
                className={({ isActive }) =>
                  ["rounded-md px-3 py-1.5 transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                }
              >
                অর্ডার
              </NavLink>
              <NavLink
                to="/admin/categories"
                className={({ isActive }) =>
                  ["rounded-md px-3 py-1.5 transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                }
              >
                ক্যাটাগরি
              </NavLink>
              <NavLink
                to="/admin/products"
                className={({ isActive }) =>
                  ["rounded-md px-3 py-1.5 transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                }
              >
                পণ্য
              </NavLink>
              <NavLink
                to="/admin/customers"
                className={({ isActive }) =>
                  ["rounded-md px-3 py-1.5 transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                }
              >
                কাস্টমার
              </NavLink>

              <NavLink
                to="/admin/marketing"
                className={({ isActive }) =>
                  ["rounded-md px-3 py-1.5 transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/50"].join(" ")
                }
              >
                মার্কেটিং
              </NavLink>
            </nav>
          </div>

          <Button variant="secondary" size="sm" onClick={logout}>
            লগআউট
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
