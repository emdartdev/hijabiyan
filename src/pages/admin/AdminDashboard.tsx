import { useEffect, useState } from "react";
import AdminShell from "@/pages/admin/AdminShell";
import { useAdminGuard } from "@/pages/admin/useAdminGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBDT } from "@/lib/money";
import { usePageMeta } from "@/hooks/use-page-meta";
import { AlertCircle, Package, TrendingUp, ShoppingCart, Clock } from "lucide-react";
import { getAdminDashboard, type AdminDashboardBestSeller, type AdminDashboardStats } from "@/pages/admin/dashboard/adminDashboardApi";
import { Button } from "@/components/ui/button";

type StatsType = {
  todayOrders: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  lowStockCount: number;
};

export default function AdminDashboard() {
  usePageMeta("অ্যাডমিন ড্যাশবোর্ড", "আজকের অর্ডার, আয়, লো-স্টক, বেস্ট-সেলার");

  const guard = useAdminGuard();
  const [stats, setStats] = useState<StatsType>({
    todayOrders: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    lowStockCount: 0,
  });
  const [bestSellers, setBestSellers] = useState<AdminDashboardBestSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guard.isAdmin) return;
    loadStats();
  }, [guard.isAdmin]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboard();
      if (!data.stats) throw new Error("Dashboard data missing");
      setStats(data.stats as AdminDashboardStats as any);
      setBestSellers(data.bestSellers ?? []);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(String((err as any)?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  if (guard.loading || !guard.isAdmin) return null;

  return (
    <AdminShell title="ড্যাশবোর্ড">
      {loading ? (
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">ড্যাশবোর্ড ডাটা লোড হয়নি: {error}</p>
          <Button variant="secondary" onClick={loadStats}>রিফ্রেশ</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">আজকের অর্ডার</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">আজকের আয়</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBDT(stats.todayRevenue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">এ মাসের আয়</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBDT(stats.monthRevenue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">পেন্ডিং অর্ডার</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">ডেলিভার হয়েছে</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.deliveredOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">বাতিল</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.cancelledOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">লো-স্টক (&lt; ৫)</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Best Sellers */}
          <Card>
            <CardHeader>
              <CardTitle>বেস্ট-সেলিং পণ্য</CardTitle>
            </CardHeader>
            <CardContent>
              {bestSellers.length === 0 ? (
                <p className="text-sm text-muted-foreground">কোনো বিক্রয় নেই</p>
              ) : (
                <div className="space-y-2">
                  {bestSellers.map((b) => (
                    <div key={b.product_id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{b.title_bn}</p>
                        <p className="text-sm text-muted-foreground">বিক্রয়: {b.total_qty} টি</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatBDT(b.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}