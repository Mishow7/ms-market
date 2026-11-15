import { db } from "@/db";
import { orders, stores } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { Badge, EmptyState, PageHeader, Table } from "@/components/ui";
import { ORDER_STATUSES, PAYMENT_STATUSES, fmtDate, money } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function MyOrders() {
  const user = await requireUser();
  const rows = await db.select({ o: orders, store: stores.name, slug: stores.slug }).from(orders).innerJoin(stores, eq(stores.id, orders.storeId)).where(eq(orders.userId, user.id)).orderBy(desc(orders.id));
  return (
    <div>
      <PageHeader title="طلباتي" />
      <Table headers={["الطلب", "المتجر", "الإجمالي", "الدفع", "الحالة", "التاريخ"]} empty={rows.length === 0 && <EmptyState icon="🛍️" title="لا توجد طلبات بعد" action={<Link href="/stores" className="text-teal-700 underline">تصفح المتاجر</Link>} />}>
        {rows.map(({ o, store }) => <tr key={o.id}><td className="px-4 py-3"><Link href={`/account/orders/${o.id}`} className="font-mono text-xs font-bold text-teal-700">{o.orderNumber}</Link></td><td className="px-4 py-3">{store}</td><td className="px-4 py-3 font-bold">{money(o.total, o.currency)}</td><td className="px-4 py-3"><Badge className={PAYMENT_STATUSES[o.paymentStatus].color}>{PAYMENT_STATUSES[o.paymentStatus].label}</Badge></td><td className="px-4 py-3"><Badge className={ORDER_STATUSES[o.status].color}>{ORDER_STATUSES[o.status].label}</Badge></td><td className="px-4 py-3 text-xs text-slate-400">{fmtDate(o.createdAt)}</td></tr>)}
      </Table>
    </div>
  );
}
