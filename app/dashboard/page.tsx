import { db } from "@/db";
import { adEvents, campaigns, commissions, customers, orderItems, orders, plans, products, subscriptions } from "@/db/schema";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { BarChart, Badge, Card, StatCard, Table } from "@/components/ui";
import { ORDER_STATUSES, PAYMENT_STATUSES, fmtDate, money } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StoreDashboard() {
  const { store, permissions } = await requireStore();
  const sid = store.id;
  const since = new Date(Date.now() - 30 * 86400_000);
  const [[sales], [oc], [pc], [cc], [comm], recent, top, byDay, [sub], ads] = await Promise.all([
    db.select({ s: sum(orders.total) }).from(orders).where(and(eq(orders.storeId, sid), eq(orders.paymentStatus, "paid"))),
    db.select({ c: count(), newc: sql<number>`count(*) filter (where ${orders.status}='new')` }).from(orders).where(eq(orders.storeId, sid)),
    db.select({ c: count(), low: sql<number>`count(*) filter (where ${products.stock} <= 3)` }).from(products).where(eq(products.storeId, sid)),
    db.select({ c: count() }).from(customers).where(eq(customers.storeId, sid)),
    db.select({ s: sum(commissions.amount), pending: sql<string>`coalesce(sum(case when ${commissions.status}='pending' then ${commissions.amount} else 0 end),0)` }).from(commissions).where(and(eq(commissions.storeId, sid), sql`${commissions.status} <> 'voided'`)),
    db.select().from(orders).where(eq(orders.storeId, sid)).orderBy(desc(orders.id)).limit(8),
    db.select({ name: orderItems.name, q: sum(orderItems.quantity), rev: sql<string>`sum(${orderItems.quantity} * ${orderItems.price})` }).from(orderItems).where(eq(orderItems.storeId, sid)).groupBy(orderItems.name).orderBy(desc(sum(orderItems.quantity))).limit(5),
    db.select({ d: sql<string>`to_char(${orders.createdAt}, 'MM-DD')`, s: sum(orders.total) }).from(orders).where(and(eq(orders.storeId, sid), gte(orders.createdAt, since))).groupBy(sql`to_char(${orders.createdAt}, 'MM-DD')`).orderBy(sql`to_char(${orders.createdAt}, 'MM-DD')`),
    db.select({ sub: subscriptions, plan: plans }).from(subscriptions).innerJoin(plans, eq(plans.id, subscriptions.planId)).where(eq(subscriptions.storeId, sid)).orderBy(desc(subscriptions.id)).limit(1),
    db.select({ views: sql<number>`count(*) filter (where ${adEvents.type}='view' and not ${adEvents.isBot})`, clicks: sql<number>`count(*) filter (where ${adEvents.type}='click' and not ${adEvents.isBot})` }).from(adEvents).innerJoin(campaigns, eq(campaigns.id, adEvents.campaignId)).where(eq(campaigns.storeId, sid)),
  ]);
  const gross = Number(sales.s ?? 0);
  const net = gross - Number(comm.s ?? 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">مرحباً في {store.name}</h1><p className="text-sm text-slate-500">ملخص أداء متجرك</p></div>
        {sub && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm">الباقة: <b>{sub.plan.name}</b> • تنتهي {fmtDate(sub.sub.endsAt)} {sub.sub.endsAt.getTime() - Date.now() < 7 * 86400_000 && <Badge className="bg-amber-100 text-amber-700">قرب الانتهاء</Badge>}</div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المبيعات المدفوعة" value={money(gross, store.currency)} icon="💵" tone="emerald" />
        <StatCard label="الطلبات" value={oc.c} hint={`${oc.newc} طلب جديد`} icon="🧾" tone="indigo" />
        <StatCard label="المنتجات" value={pc.c} hint={pc.low > 0 ? `${pc.low} منتج بمخزون منخفض` : undefined} icon="📦" tone="amber" />
        <StatCard label="العملاء" value={cc.c} icon="👥" tone="slate" />
        {permissions.finance && <><StatCard label="عمولة المنصة" value={money(comm.s, store.currency)} hint={`غير مسوّى: ${money(comm.pending, store.currency)}`} icon="💰" tone="rose" /><StatCard label="صافي الأرباح (بعد العمولة)" value={money(net, store.currency)} icon="📈" tone="teal" /></>}
        <StatCard label="مشاهدات الإعلانات" value={ads[0]?.views ?? 0} hint={`${ads[0]?.clicks ?? 0} نقرة`} icon="📣" tone="indigo" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="المبيعات آخر 30 يوم" className="lg:col-span-2"><BarChart data={byDay.map((r) => ({ label: r.d, value: Number(r.s) }))} formatter={(v) => money(v, store.currency)} /></Card>
        <Card title="أفضل المنتجات"><ul className="divide-y divide-slate-100 text-sm">{top.map((t, i) => <li key={i} className="flex items-center justify-between py-2"><span className="truncate">{t.name}</span><span className="text-xs text-slate-500">{t.q} قطعة • {money(t.rev, store.currency)}</span></li>)}{top.length === 0 && <li className="py-6 text-center text-slate-400">لا توجد مبيعات بعد</li>}</ul></Card>
      </div>
      <Card title="أحدث الطلبات" action={<Link href="/dashboard/orders" className="text-sm font-bold text-teal-700">كل الطلبات</Link>}>
        <Table headers={["رقم الطلب", "العميل", "الإجمالي", "الدفع", "الحالة", "التاريخ"]}>
          {recent.map((o) => <tr key={o.id}><td className="px-4 py-3"><Link href={`/dashboard/orders/${o.id}`} className="font-mono text-xs font-bold text-teal-700">{o.orderNumber}</Link></td><td className="px-4 py-3">{o.customerName}</td><td className="px-4 py-3">{money(o.total, o.currency)}</td><td className="px-4 py-3"><Badge className={PAYMENT_STATUSES[o.paymentStatus].color}>{PAYMENT_STATUSES[o.paymentStatus].label}</Badge></td><td className="px-4 py-3"><Badge className={ORDER_STATUSES[o.status].color}>{ORDER_STATUSES[o.status].label}</Badge></td><td className="px-4 py-3 text-xs text-slate-400">{fmtDate(o.createdAt)}</td></tr>)}
        </Table>
      </Card>
    </div>
  );
}
