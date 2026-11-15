import { db } from "@/db";
import { plans, stores, subscriptions, users } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Badge, Button, EmptyState, PageHeader, Table } from "@/components/ui";
import { STORE_STATUSES, fmtDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminStores({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const conds = [];
  if (q) conds.push(or(ilike(stores.name, `%${q}%`), ilike(stores.slug, `%${q}%`), ilike(stores.ownerName, `%${q}%`)));
  if (status) conds.push(eq(stores.status, status));
  const rows = await db
    .select({ s: stores, owner: users.email, plan: plans.name, subEnds: subscriptions.endsAt })
    .from(stores)
    .innerJoin(users, eq(users.id, stores.ownerId))
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stores.createdAt));
  return (
    <div>
      <PageHeader title="إدارة المتاجر" description="جميع المتاجر على المنصة مع حالاتها واشتراكاتها" action={<Button href="/admin/stores/new">+ إنشاء متجر</Button>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="بحث بالاسم / الرابط / المالك" className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm" />
        <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm"><option value="">كل الحالات</option>{Object.entries(STORE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <Button type="submit" variant="outline">تصفية</Button>
      </form>
      <Table headers={["المتجر", "المالك", "الباقة", "انتهاء الاشتراك", "الحالة", "تاريخ الإنشاء", ""]} empty={rows.length === 0 && <EmptyState title="لا توجد متاجر" />}>
        {rows.map(({ s, owner, plan, subEnds }) => (
          <tr key={s.id} className="hover:bg-slate-50">
            <td className="px-4 py-3"><p className="font-bold">{s.name}</p><p className="text-xs text-slate-400">/{s.slug} {s.isFeatured && "⭐"}</p></td>
            <td className="px-4 py-3"><p>{s.ownerName}</p><p className="text-xs text-slate-400">{owner}</p></td>
            <td className="px-4 py-3">{plan ?? "-"}</td>
            <td className="px-4 py-3">{fmtDate(subEnds)}</td>
            <td className="px-4 py-3"><Badge className={STORE_STATUSES[s.status].color}>{STORE_STATUSES[s.status].label}</Badge></td>
            <td className="px-4 py-3 text-slate-500">{fmtDate(s.createdAt)}</td>
            <td className="px-4 py-3"><Link href={`/admin/stores/${s.id}`} className="font-semibold text-teal-700">إدارة</Link></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
