import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { verifyPaymentAction } from "@/actions/store";
import { ConfirmButton } from "@/components/ui/client";
import { Badge, EmptyState, PageHeader, Table } from "@/components/ui";
import { PAYMENT_METHODS, fmtDateTime, money } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { store } = await requireStore("finance");
  const { status } = await searchParams;
  const conds = [eq(payments.storeId, store.id)];
  if (status) conds.push(eq(payments.status, status));
  const rows = await db.select({ p: payments, order: orders.orderNumber, orderId: orders.id, customer: orders.customerName }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(and(...conds)).orderBy(desc(payments.id)).limit(200);
  return (
    <div>
      <PageHeader title="التحقق من المدفوعات" description="لا يُعتمد الطلب كمدفوع إلا بعد تأكيدك وصول المبلغ فعلياً. يمنع النظام الإيصالات وأرقام العمليات المكررة." />
      <div className="mb-4 flex gap-1">{[["", "الكل"], ["pending", "بانتظار التحقق"], ["verified", "تم التحقق"], ["rejected", "مرفوض"]].map(([k, l]) => <Link key={k} href={`/dashboard/payments?status=${k}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${status === k || (!status && !k) ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>{l}</Link>)}</div>
      <Table headers={["المرجع", "الطلب", "العميل", "الطريقة", "المبلغ", "رقم العملية", "الإيصال", "الحالة", "التاريخ", ""]} empty={rows.length === 0 && <EmptyState icon="💳" title="لا توجد عمليات دفع" />}>
        {rows.map(({ p, order, orderId, customer }) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-mono text-xs">{p.reference}</td><td className="px-4 py-3"><Link href={`/dashboard/orders/${orderId}`} className="font-mono text-xs text-teal-700">{order}</Link></td><td className="px-4 py-3">{customer}</td><td className="px-4 py-3">{PAYMENT_METHODS[p.method]}</td><td className="px-4 py-3 font-bold">{money(p.amount, p.currency)}</td><td className="px-4 py-3 font-mono text-xs">{p.transactionNumber ?? "-"}</td>
            <td className="px-4 py-3">{p.receiptUrl ? <a href={p.receiptUrl} target="_blank" className="text-teal-700 underline">عرض</a> : "-"}</td>
            <td className="px-4 py-3"><Badge className={p.status === "verified" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>{p.status === "verified" ? "تم التحقق" : p.status === "rejected" ? "مرفوض" : "بانتظار"}</Badge></td>
            <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(p.createdAt)}</td>
            <td className="px-4 py-3">{p.status === "pending" && <div className="flex gap-1"><ConfirmButton variant="primary" message="هل تأكدت من وصول المبلغ إلى حسابك؟" onConfirm={async () => { "use server"; await verifyPaymentAction(p.id, "verified"); }}>تأكيد</ConfirmButton><ConfirmButton message="رفض الإيصال؟" onConfirm={async () => { "use server"; await verifyPaymentAction(p.id, "rejected", "لم يتم التحقق من وصول المبلغ"); }}>رفض</ConfirmButton></div>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
