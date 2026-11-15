import { db } from "@/db";
import { addresses, customers, orders, reviews, products } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { notFound } from "next/navigation";
import { updateCustomerAction } from "@/actions/store";
import { ActionForm } from "@/components/ui/client";
import { Badge, Card, PageHeader, Select, StatCard, Table, Textarea } from "@/components/ui";
import { ORDER_STATUSES, fmtDate, money } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireStore("customers");
  const id = Number((await params).id);
  const [c] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.storeId, store.id)));
  if (!c) notFound();
  const [ords, addrs, revs] = await Promise.all([
    db.select().from(orders).where(and(eq(orders.customerId, id), eq(orders.storeId, store.id))).orderBy(desc(orders.id)),
    c.userId ? db.select().from(addresses).where(eq(addresses.userId, c.userId)) : Promise.resolve([]),
    c.userId ? db.select({ r: reviews, p: products.name }).from(reviews).innerJoin(products, eq(products.id, reviews.productId)).where(and(eq(reviews.userId, c.userId), eq(reviews.storeId, store.id))) : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={c.name} description={`${c.phone ?? ""} • ${c.email ?? ""} • عميل منذ ${fmtDate(c.createdAt)}`} />
      <div className="grid gap-4 sm:grid-cols-3"><StatCard label="عدد الطلبات" value={c.ordersCount} icon="🧾" /><StatCard label="إجمالي المشتريات المدفوعة" value={money(c.totalSpent, store.currency)} icon="💵" tone="emerald" /><StatCard label="التقييمات" value={revs.length} icon="⭐" tone="amber" /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="سجل الطلبات"><Table headers={["الطلب", "الإجمالي", "الحالة", "التاريخ"]}>{ords.map((o) => <tr key={o.id}><td className="px-4 py-2"><Link href={`/dashboard/orders/${o.id}`} className="font-mono text-xs text-teal-700">{o.orderNumber}</Link></td><td className="px-4 py-2">{money(o.total, o.currency)}</td><td className="px-4 py-2"><Badge className={ORDER_STATUSES[o.status].color}>{ORDER_STATUSES[o.status].label}</Badge></td><td className="px-4 py-2 text-xs text-slate-400">{fmtDate(o.createdAt)}</td></tr>)}</Table></Card>
          {revs.length > 0 && <Card title="مراجعات المنتجات" className="mt-6"><ul className="divide-y text-sm">{revs.map(({ r, p }) => <li key={r.id} className="py-2"><b>{p}</b> — {"★".repeat(r.rating)} <span className="text-slate-500">{r.comment}</span></li>)}</ul></Card>}
        </div>
        <div className="space-y-6">
          <Card title="تصنيف وملاحظات"><ActionForm action={updateCustomerAction}><input type="hidden" name="id" value={id} /><Select label="التصنيف" name="tag" defaultValue={c.tag} options={[{ value: "regular", label: "عادي" }, { value: "vip", label: "VIP" }, { value: "blocked", label: "محظور" }]} /><Textarea label="ملاحظات داخلية" name="notes" defaultValue={c.notes} /></ActionForm></Card>
          <Card title="العناوين">{addrs.length === 0 ? <p className="text-sm text-slate-400">لا توجد عناوين محفوظة</p> : <ul className="space-y-2 text-sm">{addrs.map((a) => <li key={a.id} className="rounded-lg bg-slate-50 p-2"><b>{a.label}</b>: {a.city} {a.area} {a.street} {a.phone && `• ${a.phone}`}</li>)}</ul>}</Card>
        </div>
      </div>
    </div>
  );
}
