import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { Badge, Button, EmptyState, PageHeader, Table } from "@/components/ui";
import { ConfirmButton, ActionButton } from "@/components/ui/client";
import { deleteProductAction, duplicateProductAction, toggleProductFlagAction } from "@/actions/store";
import { money } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; sort?: string; saved?: string }> }) {
  const { store } = await requireStore("products");
  const sp = await searchParams;
  const conds = [eq(products.storeId, store.id)];
  if (sp.q) conds.push(or(ilike(products.name, `%${sp.q}%`), ilike(products.sku, `%${sp.q}%`), ilike(products.brand, `%${sp.q}%`))!);
  if (sp.status) conds.push(eq(products.status, sp.status));
  if (sp.category) conds.push(eq(products.categoryId, Number(sp.category)));
  const order = sp.sort === "price_asc" ? asc(products.price) : sp.sort === "price_desc" ? desc(products.price) : sp.sort === "stock" ? asc(products.stock) : sp.sort === "sales" ? desc(products.salesCount) : desc(products.id);
  const [rows, cats] = await Promise.all([
    db.select({ p: products, cat: categories.name }).from(products).leftJoin(categories, eq(categories.id, products.categoryId)).where(and(...conds)).orderBy(order).limit(200),
    db.select().from(categories).where(eq(categories.storeId, store.id)),
  ]);
  return (
    <div>
      <PageHeader title="المنتجات" description={`${rows.length} منتج`} action={<Button href="/dashboard/products/new">+ إضافة منتج</Button>} />
      {sp.saved && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">تم حفظ المنتج بنجاح</div>}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="بحث بالاسم / SKU / العلامة" className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm" />
        <select name="status" defaultValue={sp.status} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">كل الحالات</option><option value="published">منشور</option><option value="draft">مسودة</option><option value="archived">مؤرشف</option></select>
        <select name="category" defaultValue={sp.category} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">كل التصنيفات</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="sort" defaultValue={sp.sort} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">الأحدث</option><option value="price_asc">السعر ↑</option><option value="price_desc">السعر ↓</option><option value="stock">المخزون الأقل</option><option value="sales">الأكثر مبيعاً</option></select>
        <Button type="submit" variant="outline">تطبيق</Button>
      </form>
      <Table headers={["المنتج", "SKU", "السعر", "المخزون", "التصنيف", "الحالة", "مميز", ""]} empty={rows.length === 0 && <EmptyState title="لا توجد منتجات" description="ابدأ بإضافة أول منتج لمتجرك" action={<Button href="/dashboard/products/new">إضافة منتج</Button>} />}>
        {rows.map(({ p, cat }) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">{p.images[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div><div><Link href={`/dashboard/products/${p.id}`} className="font-bold hover:text-teal-700">{p.name}</Link><p className="text-xs text-slate-400">{p.brand} • {p.salesCount} مبيعات</p></div></div></td>
            <td className="px-4 py-3 font-mono text-xs">{p.sku ?? "-"}</td>
            <td className="px-4 py-3"><p className="font-bold">{money(p.price, store.currency)}</p>{p.comparePrice && <p className="text-xs text-slate-400 line-through">{money(p.comparePrice, store.currency)}</p>}</td>
            <td className="px-4 py-3"><Badge className={p.stock <= 0 ? "bg-rose-100 text-rose-700" : p.stock <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>{p.stock <= 0 ? "نفد" : p.stock}</Badge></td>
            <td className="px-4 py-3">{cat ?? "-"}</td>
            <td className="px-4 py-3"><ActionButton variant="ghost" onClick={async () => { "use server"; await toggleProductFlagAction(p.id, "status", p.status === "published" ? "draft" : "published"); }}><Badge className={p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200"}>{p.status === "published" ? "منشور" : p.status === "draft" ? "مسودة" : "مؤرشف"}</Badge></ActionButton></td>
            <td className="px-4 py-3"><ActionButton variant="ghost" onClick={async () => { "use server"; await toggleProductFlagAction(p.id, "isFeatured", !p.isFeatured); }}>{p.isFeatured ? "⭐" : "☆"}</ActionButton>{p.isBestSeller && "🔥"}</td>
            <td className="px-4 py-3"><div className="flex gap-1"><Button href={`/dashboard/products/${p.id}`} size="sm" variant="outline">تعديل</Button><ActionButton onClick={async () => { "use server"; await duplicateProductAction(p.id); }}>نسخ</ActionButton><ConfirmButton onConfirm={async () => { "use server"; await deleteProductAction(p.id); }}>حذف</ConfirmButton></div></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
