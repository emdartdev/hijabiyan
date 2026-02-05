import { forwardRef } from "react";
import { formatBDT } from "@/lib/money";
import type { AdminOrderDetails, AdminOrderItem } from "./adminOrdersApi";

export const OrderInvoicePrint = forwardRef<HTMLElement, { order: AdminOrderDetails; items: AdminOrderItem[] }>(
  ({ order, items }, ref) => {
    const date = new Date(order.created_at).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });

    return (
      <section
        ref={ref as any}
        className="hidden print:block"
        aria-label={`Invoice ${order.tracking_code}`}
      >
        <div className="p-6">
          <header className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-xl font-bold">Invoice</h1>
              <p className="text-sm text-muted-foreground">Order #{order.tracking_code}</p>
              <p className="text-sm text-muted-foreground">Date: {date}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">hijabiyan.shop</div>
              <div className="text-xs text-muted-foreground">Admin generated</div>
            </div>
          </header>

          <hr className="my-6 border-border" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div className="text-sm font-medium">{order.customer_name}</div>
              <div className="text-sm">{order.customer_phone}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Delivery address</div>
              <div className="text-sm whitespace-pre-wrap">{order.delivery_address_bn}</div>
            </div>
          </div>

          <hr className="my-6 border-border" />

          <div className="space-y-2">
            <div className="text-sm font-semibold">Items</div>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{it.title_bn}</div>
                    {(it.size_bn || it.color_bn) && (
                      <div className="text-xs text-muted-foreground">
                        {it.size_bn ?? ""} {it.color_bn ?? ""}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {it.qty} × {formatBDT(it.unit_price_bdt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatBDT(it.line_total_bdt)}</div>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-6 border-border" />

          <div className="ml-auto w-full max-w-sm space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatBDT(order.subtotal_bdt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delivery fee</span>
              <span>{formatBDT(order.delivery_fee_bdt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatBDT(order.discount_bdt)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatBDT(order.total_bdt)}</span>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

OrderInvoicePrint.displayName = "OrderInvoicePrint";
