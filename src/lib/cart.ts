export type CartItem = {
  productId: string;
  variantId?: string | null;
  titleBn: string;
  imageUrl?: string | null;
  colorBn?: string | null;
  sizeBn?: string | null;
  unitPriceBdt: number;
  qty: number;
  categorySlug?: string | null;
  baseUnitPriceBdt: number;
  price_tiers?: { min_qty: number; unit_price: number }[] | null;
};

const CART_KEY = "hijabiyan_cart_v1";
export const CART_EVENT = "hijabiyan_cart_updated";

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.unitPriceBdt * it.qty, 0);
}

export function cartTotalSavings(items: CartItem[]) {
  return items.reduce((sum, it) => {
    const savingsPerUnit = Math.max(0, it.baseUnitPriceBdt - it.unitPriceBdt);
    return sum + savingsPerUnit * it.qty;
  }, 0);
}

export function cartBaseSubtotal(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.baseUnitPriceBdt * it.qty, 0);
}

export function cartTotalQty(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.qty, 0);
}

export function upsertCartItem(next: CartItem) {
  const items = readCart();
  const key = `${next.productId}::${next.variantId ?? ""}`;
  const idx = items.findIndex((it) => `${it.productId}::${it.variantId ?? ""}` === key);
  if (idx >= 0) {
    items[idx] = { ...items[idx], qty: items[idx].qty + next.qty };
  } else {
    items.push(next);
  }
  writeCart(items);
  return items;
}

export function updateCartQty(productId: string, variantId: string | null | undefined, qty: number) {
  const items = readCart();
  const key = `${productId}::${variantId ?? ""}`;
  const next = items
    .map((it) => ({ ...it }))
    .filter((it) => {
      const itKey = `${it.productId}::${it.variantId ?? ""}`;
      if (itKey !== key) return true;
      return qty > 0;
    })
    .map((it) => {
      const itKey = `${it.productId}::${it.variantId ?? ""}`;
      if (itKey !== key) return it;
      
      return { ...it, qty };
    });
  writeCart(next);
  return next;
}

export function clearCart() {
  writeCart([]);
}
