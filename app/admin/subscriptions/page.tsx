import { db } from "@/db";
import { plans, stores, subscriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Badge, PageHeader, Table } from "@/components/ui";
import { fmtDate, money } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";
const ST: Record<string, { l: string; c: string }> = { active: { l: "نشط", c: "bg-emerald-100 text-emerald-700" }, expired: { l: "منتهي", c: "bg-rose-100 text-rose-700" }, cancelled: { l: "ملغي", c: "bg-slate-100 text-slate-600" }, pending_payment: { l: "بانتظار الدفع", c: "bg-amber-100 text-amber-700" } };

export default async function Subs() {
  const rows = await db.select({ s: subscriptions, store: stores, plan: plans }).from(subscriptions).innerJoin(stores, eq(stores.id, subscriptions.storeId)).innerJoin(plans, eq(plans.id, subscriptions.planId)).orderBy(desc(subscriptions.id));
  const now = Date.now();
  return (
    <div>
      <PageHeader title="الاشتراكات" description="متابعة اشتراكات المتاجر والتجديد والانتهاء. التجديد/الترقية من صفحة المتجر." />
      <Table headers={["المتجر", "الباقة", "الدورة", "المبلغ", "البداية", "الانتهاء", "الحالة"]}>
        {rows.map(({ s, store, plan }) => {
          const days = Math.ceil((s.endsAt.getTime() - now) / 86400_000);
          return (
            <tr key={s.id}>
              <td className="px-4 py-3"><Link href={`/admin/stores/${store.id}`} className="font-bold hover:text-teal-700">{store.name}</Link></td>
              <td className="px-4 py-3">{plan.name}</td>
              <td className="px-4 py-3">{s.billingCycle === "yearly" ? "سنوي" : "شهري"}</td>
              <td className="px-4 py-3">{money(s.amount, plan.currency)}</td>
              <td className="px-4 py-3">{fmtDate(s.startsAt)}</td>
              <td className="px-4 py-3">{fmtDate(s.endsAt)} {days <= 7 && days >= 0 && <Badge className="bg-amber-100 text-amber-700">ينتهي خلال {days} يوم</Badge>}{days < 0 && <Badge className="bg-rose-100 text-rose-700">منتهي</Badge>}</td>
              <td className="px-4 py-3"><Badge className={ST[s.status]?.c}>{ST[s.status]?.l ?? s.status}</Badge></td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
