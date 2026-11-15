import { db } from "@/db";
import { commissions, orderItems, orders, payments } from "@/db/schema";
import { and, desc, eq, gte, sql, sum } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { BarChart, Card, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDate, money, PAYMENT_METHODS } from "@/lib/utils";
import { ExportCsvButton } from "@/components/dashboard/ExportCsv";
export const dynamic = "force-dynamic";

export default async function Reports() {
  const { store } = await requireStore("finance");
  const sid = store.id;
  const since = new Date(Date.now() - 90 * 86400_000);
  const [[s], [c], byMethod, monthly, top, recentComm] = await Promise.all([
    db.select({ paid: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus}='paid'),0)`, pendingPay: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus}='pending_review'),0)`, unpaid: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus}='unpaid' and ${orders.status} not in ('cancelled','returned')),0)`, shipping: sql<string>`coalesce(sum(${orders.shippingFee}) filter (where ${orders.paymentStatus}='paid'),0)`, discounts: sql<string>`coalesce(sum(${orders.discount}) filter (where ${orders.paymentStatus}='paid'),0)` }).from(orders).where(eq(orders.storeId, sid)),
    db.select({ all: sql<string>`coalesce(sum(${commissions.amount}) filter (where ${commissions.status}<>'voided'),0)`, pending: sql<string>`coalesce(sum(${commissions.amount}) filter (where ${commissions.status}='pending'),0)`, settled: sql<string>`coalesce(sum(${commissions.amount}) filter (where ${commissions.status}='settled'),0)` }).from(commissions).where(eq(commissions.storeId, sid)),
    db.select({ m: orders.paymentMethod, t: sum(orders.total), n: sql<number>`count(*)` }).from(orders).where(and(eq(orders.storeId, sid), eq(orders.paymentStatus, "paid"))).groupBy(orders.paymentMethod),
    db.select({ d: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`, t: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus}='paid'),0)`, n: sql<number>`count(*)` }).from(orders).where(and(eq(orders.storeId, sid), gte(orders.createdAt, since))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ name: orderItems.name, q: sum(orderItems.quantity), rev: sql<string>`sum(${orderItems.quantity}*${orderItems.price})` }).from(orderItems).where(eq(orderItems.storeId, sid)).groupBy(orderItems.name).orderBy(desc(sql`sum(${orderItems.quantity}*${orderItems.price})`)).limit(10),
    db.select({ c: commissions, o: orders.orderNumber }).from(commissions).innerJoin(orders, eq(orders.id, commissions.orderId)).where(eq(commissions.storeId, sid)).orderBy(desc(commissions.id)).limit(30),
  ]);
  const net = Number(s.paid) - Number(c.all);
  return (
    <div className="space-y-6">
      <PageHeader title="التقارير المالية والمستحقات" description="الأرباح والمستحقات وعمولة المنصة" action={<ExportCsvButton filename="monthly-sales.csv" rows={[["الشهر", "المبيعات المدفوعة", "عدد الطلبات"], ...monthly.map((m) => [m.d, m.t, String(m.n)])]} />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المبيعات المدفوعة" value={money(s.paid, store.currency)} icon="💵" tone="emerald" />
        <StatCard label="عمولة المنصة المستحقة" value={money(c.all, store.currency)} hint={`غير مسوّى ${money(c.pending, store.currency)} • مسوّى ${money(c.settled, store.currency)}`} icon="💰" tone="amber" />
        <StatCard label="صافي المستحق لك" value={money(net, store.currency)} hint="المبيعات المدفوعة − عمولة المنصة (قبل رسوم الدفع)" icon="📈" />
        <StatCard label="بانتظار التحقق من الدفع" value={money(s.pendingPay, store.currency)} hint={`غير مدفوع: ${money(s.unpaid, store.currency)}`} icon="⏳" tone="slate" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="المبيعات الشهرية"><BarChart data={monthly.map((m) => ({ label: m.d, value: Number(m.t) }))} formatter={(v) => money(v, store.currency)} /></Card>
        <Card title="حسب طريقة الدفع"><ul className="divide-y text-sm">{byMethod.map((m) => <li key={m.m} className="flex justify-between py-2"><span>{PAYMENT_METHODS[m.m]}</span><span>{m.n} طلب • {money(m.t, store.currency)}</span></li>)}{byMethod.length === 0 && <li className="py-6 text-center text-slate-400">لا توجد بيانات</li>}</ul><p className="mt-4 text-xs text-slate-400">رسوم الشحن المحصّلة: {money(s.shipping, store.currency)} • الخصومات الممنوحة: {money(s.discounts, store.currency)}</p></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="أفضل 10 منتجات بالإيراد"><Table headers={["المنتج", "الكمية", "الإيراد"]}>{top.map((t, i) => <tr key={i}><td className="px-4 py-2">{t.name}</td><td className="px-4 py-2">{t.q}</td><td className="px-4 py-2 font-bold">{money(t.rev, store.currency)}</td></tr>)}</Table></Card>
        <Card title="سجل العمولات"><Table headers={["الطلب", "الأساس", "العمولة", "الحالة", "التاريخ"]}>{recentComm.map(({ c, o }) => <tr key={c.id}><td className="px-4 py-2 font-mono text-xs">{o}</td><td className="px-4 py-2">{money(c.orderTotal, store.currency)}</td><td className="px-4 py-2">{money(c.amount, store.currency)}</td><td className="px-4 py-2">{c.status === "settled" ? "مسوّى" : c.status === "voided" ? "ملغى" : "مستحق"}</td><td className="px-4 py-2 text-xs text-slate-400">{fmtDate(c.createdAt)}</td></tr>)}</Table></Card>
      </div>
    </div>
  );
}
