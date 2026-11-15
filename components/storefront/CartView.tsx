"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { money } from "@/lib/utils";

export function CartView({ slug, color }: { slug: string; color: string }) {
  const { items, remove, setQty, clear } = useCart();
  if (items.length === 0) return <div className="mt-8 rounded-3xl border border-dashed p-16 text-center"><p className="text-5xl">🛒</p><p className="mt-3 font-bold">سلتك فارغة</p><Link href={`/s/${slug}/products`} className="mt-4 inline-block rounded-xl px-5 py-2 font-bold text-white" style={{ background: color }}>تصفح المنتجات</Link></div>;
  const stores = [...new Set(items.map((i) => i.storeId))];
  const total = items.reduce((a, i) => a + i.price * i.qty, 0);
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {stores.map((sid) => (
          <div key={sid} className="rounded-2xl border border-black/5 bg-white/70 p-4">
            <p className="mb-3 text-sm font-bold opacity-70">🏬 {items.find((i) => i.storeId === sid)?.storeName}</p>
            {items.filter((i) => i.storeId === sid).map((i) => (
              <div key={i.productId + (i.variant ?? "")} className="flex items-center gap-3 border-t border-black/5 py-3 first:border-0">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">{i.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.image} alt="" className="h-full w-full object-cover" />}</div>
                <div className="flex-1"><p className="font-bold">{i.name}</p>{i.variant && <p className="text-xs opacity-60">{i.variant}</p>}<p className="text-sm" style={{ color }}>{money(i.price, i.currency)}</p></div>
                <div className="flex items-center rounded-xl border"><button onClick={() => setQty(i.productId, i.qty - 1, i.variant)} className="px-2 py-1">−</button><span className="w-8 text-center">{i.qty}</span><button onClick={() => setQty(i.productId, i.qty + 1, i.variant)} className="px-2 py-1">+</button></div>
                <button onClick={() => remove(i.productId, i.variant)} className="text-rose-600">✕</button>
              </div>
            ))}
          </div>
        ))}
        <button onClick={clear} className="text-sm text-rose-600">إفراغ السلة</button>
      </div>
      <div className="h-fit rounded-2xl border border-black/5 bg-white/70 p-5">
        <p className="flex justify-between text-lg font-black"><span>المجموع</span><span>{money(total, items[0].currency)}</span></p>
        {stores.length > 1 && <p className="mt-2 text-xs opacity-60">سلتك تحتوي منتجات من {stores.length} متاجر؛ سيتم إنشاء طلب مستقل لكل متجر.</p>}
        <p className="mt-1 text-xs opacity-60">الشحن والخصومات تُحسب في صفحة الدفع</p>
        <Link href={`/s/${slug}/checkout`} className="mt-4 block rounded-xl py-3 text-center font-bold text-white" style={{ background: color }}>إتمام الطلب</Link>
      </div>
    </div>
  );
}
