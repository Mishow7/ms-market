import { db } from "@/db";
import { customers } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { Badge, Button, EmptyState, PageHeader, Table } from "@/components/ui";
import { fmtDate, money } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";
const TAG: Record<string, { l: string; c: string }> = { regular: { l: "عادي", c: "bg-slate-100" }, vip: { l: "VIP", c: "bg-amber-100 text-amber-700" }, blocked: { l: "محظور", c: "bg-rose-100 text-rose-700" } };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { store } = await requireStore("customers");
  const { q } = await searchParams;
  const conds = [eq(customers.storeId, store.id)];
  if (q) conds.push(or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`), ilike(customers.email, `%${q}%`))!);
  const rows = await db.select().from(customers).where(and(...conds)).orderBy(desc(customers.id)).limit(300);
  return (
    <div>
      <PageHeader title="العملاء" description="عملاء متجرك فقط — معزولون عن باقي المتاجر" />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="بحث بالاسم / الهاتف / البريد" className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm" /><Button type="submit" variant="outline">بحث</Button></form>
      <Table headers={["العميل", "الهاتف", "الطلبات", "إجمالي المشتريات", "التصنيف", "منذ", ""]} empty={rows.length === 0 && <EmptyState icon="👥" title="لا يوجد عملاء بعد" />}>
        {rows.map((c) => <tr key={c.id}><td className="px-4 py-3"><p className="font-bold">{c.name}</p><p className="text-xs text-slate-400">{c.email}</p></td><td className="px-4 py-3">{c.phone}</td><td className="px-4 py-3">{c.ordersCount}</td><td className="px-4 py-3 font-bold">{money(c.totalSpent, store.currency)}</td><td className="px-4 py-3"><Badge className={TAG[c.tag]?.c}>{TAG[c.tag]?.l}</Badge></td><td className="px-4 py-3 text-xs text-slate-400">{fmtDate(c.createdAt)}</td><td className="px-4 py-3"><Link href={`/dashboard/customers/${c.id}`} className="font-semibold text-teal-700">عرض</Link></td></tr>)}
      </Table>
    </div>
  );
}
