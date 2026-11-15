"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "@/actions/storefront";

type Ctx = { items: CartItem[]; add: (i: CartItem) => void; remove: (productId: number, variant?: string) => void; setQty: (productId: number, qty: number, variant?: string) => void; clear: () => void; count: number };
const C = createContext<Ctx | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem("ms_cart") || "[]")); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem("ms_cart", JSON.stringify(items)); }, [items, ready]);
  const key = (i: { productId: number; variant?: string }) => `${i.productId}|${i.variant ?? ""}`;
  return (
    <C.Provider value={{
      items,
      add: (i) => setItems((prev) => { const ex = prev.find((x) => key(x) === key(i)); return ex ? prev.map((x) => (key(x) === key(i) ? { ...x, qty: x.qty + i.qty } : x)) : [...prev, i]; }),
      remove: (productId, variant) => setItems((prev) => prev.filter((x) => key(x) !== key({ productId, variant }))),
      setQty: (productId, qty, variant) => setItems((prev) => prev.map((x) => (key(x) === key({ productId, variant }) ? { ...x, qty: Math.max(1, qty) } : x))),
      clear: () => setItems([]),
      count: items.reduce((a, b) => a + b.qty, 0),
    }}>{children}</C.Provider>
  );
}
export function useCart() { const c = useContext(C); if (!c) throw new Error("no cart"); return c; }
