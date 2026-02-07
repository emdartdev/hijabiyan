import { NavLink } from "@/components/NavLink";
import SiteButton from "@/components/site/SiteButton";
import { ShoppingBag, Search, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function SiteHeader() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [bump, setBump] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      const count = readCart().reduce((s, it) => s + it.qty, 0);
      setCartCount(count);
      setBump(true);
      setTimeout(() => setBump(false), 300);
    };
    
    sync();
    window.addEventListener("storage", sync);
    import("@/lib/cart").then((m) => {
      window.addEventListener(m.CART_EVENT, sync);
    });

    return () => {
      window.removeEventListener("storage", sync);
      import("@/lib/cart").then((m) => {
        window.removeEventListener(m.CART_EVENT, sync);
      });
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = q.trim();
    navigate(next ? `/catalog?search=${encodeURIComponent(next)}` : "/catalog");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-3">
        <NavLink to="/" className="font-semibold tracking-tight" activeClassName="text-primary">
          <span className="flex items-center gap-2">
            <img src={logo} alt="হিজাবিয়ান" className="h-10 md:h-12 w-auto" loading="eager" />
            <span className="sr-only">hijabiyan.shop</span>
          </span>
        </NavLink>

        <div className="flex-1" />

        <form onSubmit={submit} className="hidden lg:flex items-center gap-2">
          <div className="relative w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="pl-9"
              aria-label="পণ্য খুঁজুন"
            />
          </div>
          <Button type="submit" variant="secondary">
            খুঁজুন
          </Button>
        </form>

        <SiteButton variant="ghost" asChild className="hidden sm:inline-flex">
          <NavLink to="/track" className="gap-2">
            <Truck className="h-4 w-4" /> ট্র্যাক অর্ডার
          </NavLink>
        </SiteButton>

        <SiteButton asChild>
          <NavLink to="/cart" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">কার্ট</span>
            <span className={`ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground transition-transform ${bump ? "animate-cart-bump" : ""}`}>
              {cartCount}
            </span>
          </NavLink>
        </SiteButton>
      </div>

      <div className="container pb-2 lg:hidden">
        <form onSubmit={submit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য খুঁজুন..." className="h-9 pl-9 text-sm" />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            খুঁজুন
          </Button>
        </form>
      </div>
    </header>
  );
}

// Local alias to keep existing JSX unchanged where possible
const Button = SiteButton;
