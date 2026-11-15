"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import type { ProductVariant } from "@/db/schema";
import Link from "next/link";

export function AddToCart({ product, store, color }: { product: { id: number; name: string; price: number; image?: string; stock: number; options: { name: string; values: string[] }[]; variants: ProductVariant[] }; store: { id: number; slug: string; name: string; currency: string }; color: string }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((v) => Object.entries(v.options).every(([k, val]) => sel[k] === val));
  const needsVariant = product.options.length > 0 && product.variants.length > 0 && !variant;
  const price = variant?.price ? Number(variant.price) : product.price;
  const stock = variant ? variant.stock : product.stock;
  return (
    <div className="space-y-4">
      {product.options.map((o) => (
        <div key={o.name}><p className="mb-1 text-sm font-bold">{o.name}</p><div className="flex flex-wrap gap-2">{o.values.map((v) => <button key={v} onClick={() => setSel({ ...sel, [o.name]: v })} className="rounded-xl border px-3 py-1.5 text-sm" style={sel[o.name] === v ? { background: color, color: "#fff", borderColor: color } : undefined}>{v}</button>)}</div></div>
      ))}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border"><button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2">−</button><span className="w-10 text-center font-bold">{qty}</span><button onClick={() => setQty(Math.min(stock || 1, qty + 1))} className="px-3 py-2">+</button></div>
        <button disabled={stock <= 0 || needsVariant} onClick={() => { add({ productId: product.id, storeId: store.id, storeSlug: store.slug, storeName: store.name, name: product.name, price, qty, image: variant?.image || product.image, variant: variant?.name, currency: store.currency }); setAdded(true); setTimeout(() => setAdded(false), 2000); }} className="flex-1 rounded-xl py-3 font-bold text-white shadow-lg disabled:opacity-50" style={{ background: color }}>{needsVariant ? "اختر الخيارات" : stock <= 0 ? "غير متوفر" : added ? "✓ تمت الإضافة" : "🛒 أضف إلى السلة"}</button>
      </div>
      {added && <Link href={`/s/${store.slug}/cart`} className="block text-center text-sm underline">الذهاب إلى السلة ←</Link>}
    </div>
  );
}
