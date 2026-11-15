import { db } from "@/db";
import { storeCategories, stores } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { StoreCard } from "@/components/site/StoreCard";
import { EmptyState } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q, category } = await searchParams;
  const conds = [eq(stores.status, "active")];
  if (q) conds.push(or(ilike(stores.name, `%${q}%`), ilike(stores.description, `%${q}%`))!);
  if (category) conds.push(eq(stores.categoryId, Number(category)));
  const [rows, cats] = await Promise.all([db.select().from(stores).where(and(...conds)).orderBy(desc(stores.isFeatured), desc(stores.createdAt)), db.select().from(storeCategories)]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-black">استكشف المتاجر</h1>
      <form className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="ابحث عن متجر..." className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500" />
        <select name="category" defaultValue={category} className="rounded-xl border border-slate-300 px-4 py-2.5">
          <option value="">كل التصنيفات</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button className="rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white">بحث</button>
        {(q || category) && <Link href="/stores" className="rounded-xl px-4 py-2.5 text-slate-500">مسح</Link>}
      </form>
      {rows.length === 0 ? <EmptyState icon="🏬" title="لا توجد متاجر مطابقة" description="جرّب كلمات بحث أخرى أو تصفح كل التصنيفات" /> : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{rows.map((s) => <StoreCard key={s.id} store={s} />)}</div>
      )}
    </div>
  );
}
