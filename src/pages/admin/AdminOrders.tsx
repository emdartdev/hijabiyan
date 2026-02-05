import { useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/pages/admin/AdminShell";
import { useAdminGuard } from "@/pages/admin/useAdminGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatBDT } from "@/lib/money";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteOrder, getOrderDetails, listOrders, patchOrder, type AdminOrderDetails, type AdminOrderItem, type AdminOrderListRow } from "@/pages/admin/orders/adminOrdersApi";
import { OrderInvoicePrint } from "@/pages/admin/orders/OrderInvoicePrint";
import { supabase } from "@/integrations/supabase/client";

type OrderStatus = Database["public"]["Enums"]["order_status"];

type OrderRow = AdminOrderListRow;
type OrderItemRow = AdminOrderItem;

const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "নিশ্চিত",
  packed: "প্যাক হয়েছে",
  shipped: "পাঠানো হয়েছে",
  delivered: "ডেলিভার হয়েছে",
  cancelled: "বাতিল",
};

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "secondary",
  packed: "outline",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

export default function AdminOrders() {
  usePageMeta("অ্যাডমিন | অর্ডার", "অর্ডার ম্যানেজ, status আপডেট, address এডিট");

  const guard = useAdminGuard();
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<AdminOrderDetails | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<OrderStatus | null>(null);
  const [editDeliveryStatus, setEditDeliveryStatus] = useState<string>("pending");
  const [deliveryPartnerName, setDeliveryPartnerName] = useState("");
  const [deliveryPartnerPhone, setDeliveryPartnerPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const printRef = useRef<HTMLElement | null>(null);
  const detailsAbortRef = useRef<AbortController | null>(null);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);

  useEffect(() => {
    if (!guard.isAdmin) return;
    loadOrders();
  }, [guard.isAdmin]);

  useEffect(() => {
    // Reset previous dialog data immediately to avoid showing stale info while the new order loads.
    setDetails(null);
    setItems([]);
    setDetailsError(null);

    if (!selectedId) {
      detailsAbortRef.current?.abort();
      detailsAbortRef.current = null;
      setDetailsLoading(false);
      return;
    }

    detailsAbortRef.current?.abort();
    const ac = new AbortController();
    detailsAbortRef.current = ac;
    setDetailsLoading(true);
    loadOrderDetails(selectedId, ac.signal);

    return () => ac.abort();
  }, [selectedId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const rows = await listOrders({ search, limit: 200 });
      setOrders(rows);
    } catch (err) {
      console.error("Load orders error:", err);
      toast({ title: "লোড ব্যর্থ", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: string, signal?: AbortSignal) => {
    try {
      const { order, items } = await getOrderDetails(orderId, { signal });
      setDetails(order);
      setItems(items);
      if (order) {
        setEditStatus(order.status as OrderStatus);
        setEditDeliveryStatus(order.delivery_status ?? "pending");
        setEditAddress(order.delivery_address_bn);
        setAdminNotes(order.notes_bn ?? "");
        setDeliveryPartnerName(order.delivery_partner_name ?? "");
        setDeliveryPartnerPhone(order.delivery_partner_phone ?? "");
      }
    } catch (err) {
      // Ignore abort errors (user clicked another order / closed dialog)
      if ((err as any)?.name === "AbortError") return;
      console.error("Load order items error:", err);
      setDetailsError(String(err));
      toast({ title: "অর্ডার ডিটেইলস লোড ব্যর্থ", description: String(err), variant: "destructive" });
    } finally {
      // Prevent older requests from turning off loading for a newer selection.
      if (!signal || detailsAbortRef.current?.signal === signal) {
        setDetailsLoading(false);
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedId || !editStatus) return;
    setBusy(true);
    try {
      await patchOrder({
        id: selectedId,
        status: editStatus,
        delivery_status: editDeliveryStatus,
        delivery_address_bn: editAddress.trim(),
        notes_bn: adminNotes.trim() || null,
        delivery_partner_name: deliveryPartnerName.trim() || null,
        delivery_partner_phone: deliveryPartnerPhone.trim() || null,
      });
      toast({ title: "আপডেট সফল" });
      await loadOrders();
      setSelectedId(null);
    } catch (err) {
      console.error("Update error:", err);
      toast({ title: "আপডেট ব্যর্থ", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("এই অর্ডারটি পারমানেন্টলি ডিলিট করবেন? এই কাজ আর ফেরানো যাবে না।")) return;

    setBusy(true);
    try {
      await deleteOrder(selectedId);

      // Optimistic update
      setOrders((prev) => prev.filter((o) => o.id !== selectedId));
      toast({ title: "অর্ডার ডিলিট হয়েছে" });
      setSelectedId(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast({ title: "ডিলিট ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        String(o.tracking_code ?? "").toLowerCase().includes(q) ||
        String(o.customer_name ?? "").toLowerCase().includes(q) ||
        String(o.customer_phone ?? "").includes(search.trim()),
    );
  }, [orders, search]);

  if (guard.loading || !guard.isAdmin) return null;

  return (
    <AdminShell title="অর্ডার ম্যানেজমেন্ট">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tracking code / নাম / ফোন দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button variant="outline" onClick={() => loadOrders()}>
            রিফ্রেশ
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">লোড হচ্ছে...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">কোনো অর্ডার পাওয়া যায়নি।</p>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">অর্ডার লিস্ট</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const date = new Date(order.created_at).toLocaleString("bn-BD", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });
                    return (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(order.id)}
                      >
                        <TableCell className="font-medium">#{order.tracking_code}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{order.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[order.status as OrderStatus]}>
                            {STATUS_LABELS[order.status as OrderStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{order.delivery_status}</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatBDT(order.total_bdt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{date}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              অর্ডার #{details?.tracking_code ?? selected?.tracking_code ?? "..."}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading && (
            <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
          )}

          {!detailsLoading && detailsError && (
            <p className="text-sm text-destructive">{detailsError}</p>
          )}

          {!detailsLoading && details && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="font-medium">নাম:</span> {details.customer_name}
                </p>
                <p>
                  <span className="font-medium">ফোন:</span> {details.customer_phone}
                </p>
                <p>
                  <span className="font-medium">পেমেন্ট:</span> {details.payment_method}
                </p>
                <p>
                  <span className="font-medium">সাবটোটাল:</span> {formatBDT(details.subtotal_bdt)}
                </p>
                <p>
                  <span className="font-medium">ডেলিভারি ফি:</span> {formatBDT(details.delivery_fee_bdt)}
                </p>
                <p>
                  <span className="font-medium">ডিসকাউন্ট:</span> {formatBDT(details.discount_bdt)}
                </p>
                <p className="text-lg font-semibold">
                  <span className="font-medium">মোট:</span> {formatBDT(details.total_bdt)}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">অর্ডার স্ট্যাটাস</label>
                <Select value={editStatus ?? undefined} onValueChange={(v) => setEditStatus(v as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">নিশ্চিত</SelectItem>
                    <SelectItem value="packed">প্যাক হয়েছে</SelectItem>
                    <SelectItem value="shipped">পাঠানো হয়েছে</SelectItem>
                    <SelectItem value="delivered">ডেলিভার হয়েছে</SelectItem>
                    <SelectItem value="cancelled">বাতিল</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">ডেলিভারি স্ট্যাটাস</label>
                <Select value={editDeliveryStatus} onValueChange={(v) => setEditDeliveryStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="ডেলিভারি স্ট্যাটাস" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="assigned">assigned</SelectItem>
                    <SelectItem value="out_for_delivery">out_for_delivery</SelectItem>
                    <SelectItem value="delivered">delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">ডেলিভারি পার্টনার নাম</label>
                  <Input value={deliveryPartnerName} onChange={(e) => setDeliveryPartnerName(e.target.value)} placeholder="নাম" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">ডেলিভারি পার্টনার ফোন</label>
                  <Input value={deliveryPartnerPhone} onChange={(e) => setDeliveryPartnerPhone(e.target.value)} placeholder="ফোন" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">ডেলিভারি ঠিকানা</label>
                <Textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  rows={2}
                  placeholder="ঠিকানা..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">অ্যাডমিন নোট (internal)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="আপনার নোট..."
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">অর্ডার আইটেম</p>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">কোনো আইটেম নেই</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div>
                          <p className="font-medium">{it.title_bn}</p>
                          {(it.size_bn || it.color_bn) && (
                            <p className="text-muted-foreground">
                              {it.size_bn} {it.color_bn}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            {it.qty} × {formatBDT(it.unit_price_bdt)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatBDT(it.line_total_bdt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="destructive" onClick={handleDelete} disabled={busy}>
                  ডিলিট
                </Button>
                <Button
                  variant="outline"
                  disabled={!details}
                  onClick={() => {
                    // Print only (as requested)
                    window.print();
                  }}
                >
                  Print invoice
                </Button>
                <Button variant="outline" onClick={() => setSelectedId(null)} disabled={busy}>
                  বাতিল
                </Button>
                <Button onClick={handleUpdate} disabled={busy}>
                  {busy ? "সেভ হচ্ছে..." : "সেভ"}
                </Button>
              </div>

              {/* Print-only invoice */}
              <OrderInvoicePrint ref={printRef as any} order={details} items={items} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}