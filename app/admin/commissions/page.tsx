import { db } from "@/db";
import { commissions, orders, stores } from "@/db/schema";
import { desc, eq, sql, sum } from "drizzle-orm";
import { adminSettleCommissionAction } from "@/actions/admin";
import { ConfirmButton } from "@/components/ui/client";
import { Badge, Card, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDate, money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Commissions() {
  const [rows, perStore, [tot]] = await Promise.all([
    db.select({ c: commissions, store: stores.name, order: orders.orderNumber, currency: orders.currency }).from(commissions).innerJoin(stores, eq(stores.id, commissions.storeId)).innerJoin(orders, eq(orders.id, commissions.orderId)).orderBy(desc(commissions.id)).limit(200),
    db.select({ store: stores.name, id: stores.id, sales: sum(commissions.orderTotal), comm: sum(commissions.amount), pending: sql<string>`coalesce(sum(case when ${commissions.status}='pending' then ${commissions.amount} else 0 end),0)` }).from(commissions).innerJoin(stores, eq(stores.id, commissions.storeId)).where(sql`${commissions.status} <> 'voided'`).groupBy(stores.id).orderBy(desc(sum(commissions.amount))),
    db.select({ all: sum(commissions.amount), pending: sql<string>`coalesce(sum(case when ${commissions.status}='pending' then ${commissions.amount} else 0 end),0)`, settled: sql<string>`coalesce(sum(case when ${commissions.status}='settled' then ${commissions.amount} else 0 end),0)`, sales: sum(commissions.orderTotal) }).from(commissions).where(sql`${commissions.status} <> 'voided'`),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="العمولات والأرباح" description="تُحتسب العمولة من الطلبات المدفوعة المؤهلة فقط (بعد الخصومات، دون الشحن) وتُلغى عند الإلغاء/الاسترجاع. عند التحويل المباشر للتاجر تُسجّل كمستحق عليه حتى تسويتها." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المبيعات المؤهلة" value={money(tot.sales)} icon="🛒" tone="slate" /><StatCard label="إجمالي العمولات" value={money(tot.all)} icon="💰" /><StatCard label="مستحق غير مسوّى" value={money(tot.pending)} icon="⏳" tone="amber" /><StatCard label="تمت تسويته" value={money(tot.settled)} icon="✅" tone="emerald" />
      </div>
      <Card title="ملخص حسب المتجر">
        <Table headers={["المتجر", "المبيعات المؤهلة", "عمولة المنصة", "غير مسوّى", "صافي التاجر"]}>
          {perStore.map((r) => <tr key={r.id}><td className="px-4 py-3 font-bold">{r.store}</td><td className="px-4 py-3">{money(r.sales)}</td><td className="px-4 py-3">{money(r.comm)}</td><td className="px-4 py-3 text-amber-700">{money(r.pending)}</td><td className="px-4 py-3 text-emerald-700">{money(Number(r.sales) - Number(r.comm))}</td></tr>)}
        </Table>
      </Card>
      <Card title="سجل العمولات">
        <Table headers={["الطلب", "المتجر", "أساس الاحتساب", "المعدل", "العمولة", "الحالة", "التاريخ", ""]}>
          {rows.map(({ c, store, order, currency }) => (
            <tr key={c.id}><td className="px-4 py-3 font-mono text-xs">{order}</td><td className="px-4 py-3">{store}</td><td className="px-4 py-3">{money(c.orderTotal, currency)}</td><td className="px-4 py-3">{c.rateType === "percent" ? `${c.rateValue}%` : money(c.rateValue, currency)}</td><td className="px-4 py-3 font-bold">{money(c.amount, currency)}</td>
            <td className="px-4 py-3"><Badge className={c.status === "settled" ? "bg-emerald-100 text-emerald-700" : c.status === "voided" ? "bg-slate-200" : "bg-amber-100 text-amber-700"}>{c.status === "settled" ? "مسوّى" : c.status === "voided" ? "ملغى" : "مستحق"}</Badge></td><td className="px-4 py-3 text-xs text-slate-400">{fmtDate(c.createdAt)}</td>
            <td className="px-4 py-3">{c.status === "pending" && <div className="flex gap-1"><ConfirmButton variant="primary" message="تأكيد تسوية هذه العمولة؟" onConfirm={async () => { "use server"; await adminSettleCommissionAction(c.id, "settled"); }}>تسوية</ConfirmButton><ConfirmButton variant="outline" message="إلغاء العمولة؟" onConfirm={async () => { "use server"; await adminSettleCommissionAction(c.id, "voided"); }}>إلغاء</ConfirmButton></div>}</td></tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
