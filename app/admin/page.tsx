import { db } from "@/db";
import { adEvents, campaigns, commissions, orders, products, stores, subscriptions, users, orderItems } from "@/db/schema";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { BarChart, Card, StatCard, Table, Badge } from "@/components/ui";
import { money, STORE_STATUSES } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [[st], [act], [pend], [mer], [pr], [od], [sales], [comm], [subs], top, topProducts, growth, camps, recent] = await Promise.all([
    db.select({ c: count() }).from(stores),
    db.select({ c: count() }).from(stores).where(eq(stores.status, "active")),
    db.select({ c: count() }).from(stores).where(eq(stores.status, "pending")),
    db.select({ c: count() }).from(users).where(eq(users.role, "merchant")),
    db.select({ c: count() }).from(products),
    db.select({ c: count() }).from(orders),
    db.select({ s: sum(orders.total) }).from(orders).where(eq(orders.paymentStatus, "paid")),
    db.select({ s: sum(commissions.amount), pending: sql<string>`coalesce(sum(case when ${commissions.status}='pending' then ${commissions.amount} else 0 end),0)` }).from(commissions).where(sql`${commissions.status} <> 'voided'`),
    db.select({ s: sum(subscriptions.amount) }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select({ name: stores.name, id: stores.id, total: sum(orders.total), c: count() }).from(orders).innerJoin(stores, eq(stores.id, orders.storeId)).where(eq(orders.paymentStatus, "paid")).groupBy(stores.id).orderBy(desc(sum(orders.total))).limit(5),
    db.select({ name: orderItems.name, q: sum(orderItems.quantity) }).from(orderItems).groupBy(orderItems.name).orderBy(desc(sum(orderItems.quantity))).limit(5),
    db.select({ d: sql<string>`to_char(${stores.createdAt}, 'MM-DD')`, c: count() }).from(stores).where(gte(stores.createdAt, since)).groupBy(sql`to_char(${stores.createdAt}, 'MM-DD')`).orderBy(sql`to_char(${stores.createdAt}, 'MM-DD')`),
    db.select({ title: campaigns.title, store: stores.name, views: sql<number>`count(*) filter (where ${adEvents.type}='view' and not ${adEvents.isBot})`, clicks: sql<number>`count(*) filter (where ${adEvents.type}='click' and not ${adEvents.isBot})` }).from(campaigns).innerJoin(stores, eq(stores.id, campaigns.storeId)).leftJoin(adEvents, eq(adEvents.campaignId, campaigns.id)).groupBy(campaigns.id, stores.name).orderBy(desc(sql`count(*)`)).limit(5),
    db.select().from(stores).orderBy(desc(stores.createdAt)).limit(6),
  ]);
  const salesByDay = await db.select({ d: sql<string>`to_char(${orders.createdAt}, 'MM-DD')`, s: sum(orders.total) }).from(orders).where(and(gte(orders.createdAt, since))).groupBy(sql`to_char(${orders.createdAt}, 'MM-DD')`).orderBy(sql`to_char(${orders.createdAt}, 'MM-DD')`);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-extrabold">نظرة عامة على المنصة</h1><p className="text-sm text-slate-500">مؤشرات حية من قاعدة البيانات</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المتاجر" value={st.c} hint={`${act.c} نشط • ${pend.c} قيد المراجعة`} icon="🏬" />
        <StatCard label="التجار المسجلون" value={mer.c} icon="👥" tone="indigo" />
        <StatCard label="إجمالي المنتجات" value={pr.c} icon="📦" tone="amber" />
        <StatCard label="إجمالي الطلبات" value={od.c} icon="🧾" tone="slate" />
        <StatCard label="إجمالي المبيعات المدفوعة" value={money(sales.s)} icon="💵" tone="emerald" />
        <StatCard label="عمولات المنصة" value={money(comm.s)} hint={`غير مسوّى: ${money(comm.pending)}`} icon="💰" tone="teal" />
        <StatCard label="إيرادات الاشتراكات النشطة" value={money(subs.s)} icon="🧾" tone="indigo" />
        <StatCard label="إيرادات المنصة" value={money(Number(comm.s ?? 0) + Number(subs.s ?? 0))} icon="📈" tone="rose" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="المبيعات آخر 30 يوم"><BarChart data={salesByDay.map((r) => ({ label: r.d, value: Number(r.s) }))} formatter={(v) => money(v)} /></Card>
        <Card title="نمو المنصة (متاجر جديدة)"><BarChart data={growth.map((r) => ({ label: r.d, value: r.c }))} color="#f59e0b" /></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="أكثر المتاجر مبيعاً">
          <ul className="divide-y divide-slate-100 text-sm">{top.map((t) => <li key={t.id} className="flex justify-between py-2"><Link href={`/admin/stores/${t.id}`} className="font-semibold hover:text-teal-700">{t.name}</Link><span>{money(t.total)}</span></li>)}{top.length === 0 && <li className="py-6 text-center text-slate-400">لا توجد مبيعات بعد</li>}</ul>
        </Card>
        <Card title="أكثر المنتجات مبيعاً">
          <ul className="divide-y divide-slate-100 text-sm">{topProducts.map((t, i) => <li key={i} className="flex justify-between py-2"><span>{t.name}</span><Badge>{t.q} قطعة</Badge></li>)}{topProducts.length === 0 && <li className="py-6 text-center text-slate-400">لا توجد بيانات</li>}</ul>
        </Card>
        <Card title="أداء الحملات الإعلانية">
          <ul className="divide-y divide-slate-100 text-sm">{camps.map((c, i) => <li key={i} className="py-2"><p className="font-semibold">{c.title}</p><p className="text-xs text-slate-400">{c.store} • {c.views} مشاهدة • {c.clicks} نقرة</p></li>)}{camps.length === 0 && <li className="py-6 text-center text-slate-400">لا توجد حملات</li>}</ul>
        </Card>
      </div>
      <Card title="أحدث المتاجر" action={<Link href="/admin/stores" className="text-sm font-bold text-teal-700">إدارة المتاجر</Link>}>
        <Table headers={["المتجر", "المالك", "المدينة", "الحالة", ""]}>
          {recent.map((s) => (
            <tr key={s.id}><td className="px-4 py-3 font-semibold">{s.name}</td><td className="px-4 py-3">{s.ownerName}</td><td className="px-4 py-3">{s.city}</td><td className="px-4 py-3"><Badge className={STORE_STATUSES[s.status].color}>{STORE_STATUSES[s.status].label}</Badge></td><td className="px-4 py-3"><Link href={`/admin/stores/${s.id}`} className="text-teal-700">عرض</Link></td></tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
