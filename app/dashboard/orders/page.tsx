import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { Badge, Button, EmptyState, PageHeader, Table } from "@/components/ui";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, fmtDateTime, money } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function Orders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string }> }) {
  const { store } = await requireStore("orders");
  const sp = await searchParams;
  const conds = [eq(orders.storeId, store.id)];
  if (sp.q) conds.push(or(ilike(orders.orderNumber, `%${sp.q}%`), ilike(orders.customerName, `%${sp.q}%`), ilike(orders.phone, `%${sp.q}%`))!);
  if (sp.status) conds.push(eq(orders.status, sp.status));
  if (sp.payment) conds.push(eq(orders.paymentStatus, sp.payment));
  const rows = await db.select().from(orders).where(and(...conds)).orderBy(desc(orders.id)).limit(300);
  return (
    <div>
      <PageHeader title="الطلبات" description={`${rows.length} طلب`} />
      <div className="mb-4 flex flex-wrap gap-1">{Object.entries(ORDER_STATUSES).map(([k, v]) => <Link key={k} href={`/dashboard/orders?status=${k}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${sp.status === k ? v.color : "bg-white border border-slate-200 text-slate-500"}`}>{v.label}</Link>)}<Link href="/dashboard/orders" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">الكل</Link></div>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="رقم الطلب / العميل / الهاتف" className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm" />
        <select name="payment" defaultValue={sp.payment} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">كل حالات الدفع</option>{Object.entries(PAYMENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <input type="hidden" name="status" value={sp.status ?? ""} />
        <Button type="submit" variant="outline">بحث</Button>
      </form>
      <Table headers={["رقم الطلب", "العميل", "المدينة", "الإجمالي", "طريقة الدفع", "حالة الدفع", "حالة الطلب", "التاريخ"]} empty={rows.length === 0 && <EmptyState icon="🧾" title="لا توجد طلبات" description="ستظهر الطلبات هنا فور شراء العملاء من متجرك" />}>
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-slate-50">
            <td className="px-4 py-3"><Link href={`/dashboard/orders/${o.id}`} className="font-mono text-xs font-bold text-teal-700">{o.orderNumber}</Link></td>
            <td className="px-4 py-3"><p className="font-semibold">{o.customerName}</p><p className="text-xs text-slate-400">{o.phone}</p></td>
            <td className="px-4 py-3">{o.city}</td><td className="px-4 py-3 font-bold">{money(o.total, o.currency)}</td><td className="px-4 py-3">{PAYMENT_METHODS[o.paymentMethod]}</td>
            <td className="px-4 py-3"><Badge className={PAYMENT_STATUSES[o.paymentStatus].color}>{PAYMENT_STATUSES[o.paymentStatus].label}</Badge></td>
            <td className="px-4 py-3"><Badge className={ORDER_STATUSES[o.status].color}>{ORDER_STATUSES[o.status].label}</Badge></td>
            <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(o.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
