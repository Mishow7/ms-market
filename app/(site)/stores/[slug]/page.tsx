import { db } from "@/db";
import { products, storeCategories, stores, domains } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StoreDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [store] = await db.select().from(stores).where(and(eq(stores.slug, slug), eq(stores.status, "active")));
  if (!store) notFound();
  const [cat] = store.categoryId ? await db.select().from(storeCategories).where(eq(storeCategories.id, store.categoryId)) : [null];
  const prods = await db.select().from(products).where(and(eq(products.storeId, store.id), eq(products.status, "published"))).limit(8);
  const [primary] = await db.select().from(domains).where(and(eq(domains.storeId, store.id), eq(domains.isPrimary, true)));
  return (
    <div>
      <div className="h-56 w-full" style={{ background: store.cover ? `url(${store.cover}) center/cover` : `linear-gradient(135deg, ${store.colors.primary}, ${store.colors.secondary})` }} />
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-12 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-slate-100 text-3xl font-black shadow" style={{ color: store.colors.primary }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {store.logo ? <img src={store.logo} alt="" className="h-full w-full object-cover" /> : store.name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black">{store.name}</h1>
            <p className="text-sm text-slate-500">{cat ? `${cat.icon} ${cat.name} • ` : ""}📍 {store.city || store.country} {primary ? `• ${primary.hostname}` : ""}</p>
            <p className="mt-2 text-sm text-slate-600">{store.description}</p>
          </div>
          <Link href={`/s/${store.slug}`} className="rounded-2xl px-6 py-3 font-bold text-white shadow" style={{ background: store.colors.primary }}>زيارة المتجر ←</Link>
        </div>
        <h2 className="mt-12 text-xl font-black">من منتجات المتجر</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {prods.map((p) => (
            <Link key={p.id} href={`/s/${store.slug}/p/${p.id}`} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <div className="aspect-square bg-slate-100">{p.images[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
              <div className="p-3"><p className="truncate text-sm font-bold">{p.name}</p><p className="text-sm font-black" style={{ color: store.colors.primary }}>{money(p.price, store.currency)}</p></div>
            </Link>
          ))}
        </div>
        {prods.length === 0 && <p className="py-10 text-center text-slate-400">لا توجد منتجات منشورة بعد</p>}
      </div>
    </div>
  );
}
