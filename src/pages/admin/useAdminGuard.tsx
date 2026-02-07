import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AdminGuardState = {
  loading: boolean;
  isAdmin: boolean;
  userId: string | null;
};

export function useAdminGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<AdminGuardState>({ loading: true, isAdmin: false, userId: null });

  useEffect(() => {
    let mounted = true;

    const check = async (isInitial = false) => {
      if (isInitial) setState((s) => ({ ...s, loading: true }));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id ?? null;
      if (!userId) {
        if (mounted) setState({ loading: false, isAdmin: false, userId: null });
        navigate(`/admin/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      const isAdmin = !error && data === true;

      if (mounted) setState({ loading: false, isAdmin, userId });
      if (!isAdmin) navigate("/admin/login", { replace: true });
    };

    check(true);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return state;
}
