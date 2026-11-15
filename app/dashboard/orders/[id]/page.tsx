import { db } from "@/db";
import { orderEvents, orderItems, orders, payments, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { notFound } from "next/navigation";
import { updateOrderShippingAction, updateOrderStatusAction, verifyPaymentAction } from "@/actions/store";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { Badge, Button, Card, Input, PageHeader, Textarea } from "@/components/ui";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, fmtDateTime, money } from "@/lib/utils";
import { PrintButton } from "@/components/dashboard/PrintButton";
export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { store, permissions } = await requireStore("orders");
  const id = Number((await params).id);
  const [o] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.storeId, store.id)));
  if (!o) notFound();
  const [items, events, pays] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select({ e: orderEvents, by: users.name }).from(orderEvents).leftJoin(users, eq(users.id, orderEvents.byUserId)).where(eq(orderEvents.orderId, id)).orderBy(desc(orderEvents.id)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.id)),
  ]);
  const flow = ["new", "confirming", "processing", "ready", "shipped", "completed"];
  return (
    <div className="space-y-6">
      <div className="no-print"><PageHeader title={`الطلب ${o.orderNumber}`} description={fmtDateTime(o.createdAt)} action={<><PrintButton /><Button href="/dashboard/orders" variant="outline">رجوع</Button></>} /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="فاتورة الطلب" action={<div className="flex gap-2"><Badge className={PAYMENT_STATUSES[o.paymentStatus].color}>{PAYMENT_STATUSES[o.paymentStatus].label}</Badge><Badge className={ORDER_STATUSES[o.status].color}>{ORDER_STATUSES[o.status].label}</Badge></div>}>
            <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
              <p><b>المتجر:</b> {store.name}</p><p><b>رقم الطلب:</b> {o.orderNumber}</p>
              <p><b>العميل:</b> {o.customerName}</p><p><b>الهاتف:</b> {o.phone}</p>
              <p className="sm:col-span-2"><b>العنوان:</b> {o.city} - {o.address}</p>
              <p><b>طريقة الدفع:</b> {PAYMENT_METHODS[o.paymentMethod]}</p>{o.couponCode && <p><b>كوبون:</b> {o.couponCode}</p>}
              {o.notes && <p className="sm:col-span-2"><b>ملاحظات:</b> {o.notes}</p>}
            </div>
            <table className="w-full text-sm"><thead className="bg-slate-50 text-xs"><tr><th className="p-2 text-start">المنتج</th><th className="p-2">السعر</th><th className="p-2">الكمية</th><th className="p-2 text-end">الإجمالي</th></tr></thead><tbody>
              {items.map((i) => <tr key={i.id} className="border-t"><td className="p-2">{i.name}{i.variant && <span className="text-xs text-slate-400"> ({i.variant})</span>}</td><td className="p-2 text-center">{money(i.price, o.currency)}</td><td className="p-2 text-center">{i.quantity}</td><td className="p-2 text-end">{money(Number(i.price) * i.quantity, o.currency)}</td></tr>)}
            </tbody></table>
            <div className="mt-4 ms-auto w-full max-w-xs space-y-1 text-sm"><p className="flex justify-between"><span>المجموع</span><span>{money(o.subtotal, o.currency)}</span></p><p className="flex justify-between text-rose-600"><span>الخصم</span><span>- {money(o.discount, o.currency)}</span></p><p className="flex justify-between"><span>الشحن</span><span>{money(o.shippingFee, o.currency)}</span></p><p className="flex justify-between border-t pt-2 text-lg font-black"><span>الإجمالي</span><span>{money(o.total, o.currency)}</span></p></div>
          </Card>
          <Card title="المدفوعات وإثباتات التحويل" className="no-print">
            {pays.length === 0 && <p className="text-sm text-slate-400">لم يُرفع أي إثبات دفع بعد. {o.paymentMethod === "cod" && "طلب دفع عند الاستلام — أكد الدفع بعد التسليم."}</p>}
            <ul className="divide-y divide-slate-100 text-sm">{pays.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-mono text-xs">{p.reference}</p><p>{money(p.amount, p.currency)} • رقم العملية: {p.transactionNumber ?? "-"} • {fmtDateTime(p.createdAt)}</p>{p.receiptUrl && <a href={p.receiptUrl} target="_blank" className="text-teal-700 underline">عرض الإيصال</a>}{p.notes && <p className="text-xs text-slate-400">{p.notes}</p>}</div>
                <div className="flex items-center gap-2"><Badge className={p.status === "verified" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>{p.status === "verified" ? "تم التحقق" : p.status === "rejected" ? "مرفوض" : "بانتظار التحقق"}</Badge>
                  {p.status === "pending" && permissions.finance && <><ConfirmButton variant="primary" message="هل تأكدت من وصول المبلغ فعلياً إلى حسابك؟" onConfirm={async () => { "use server"; await verifyPaymentAction(p.id, "verified"); }}>تأكيد الوصول</ConfirmButton><ConfirmButton message="رفض هذا الإيصال؟" onConfirm={async () => { "use server"; await verifyPaymentAction(p.id, "rejected", "الإيصال غير صالح أو المبلغ لم يصل"); }}>رفض</ConfirmButton></>}</div>
              </li>
            ))}</ul>
            {o.paymentMethod === "cod" && o.paymentStatus !== "paid" && permissions.finance && <div className="mt-3"><ConfirmButton variant="primary" message="تأكيد استلام المبلغ نقداً؟" onConfirm={async () => { "use server"; const { db } = await import("@/db"); const { payments: P } = await import("@/db/schema"); const [pp] = await db.insert(P).values({ storeId: store.id, orderId: o.id, method: "cod", amount: o.total, currency: o.currency, reference: `COD-${o.orderNumber}`, status: "pending", source: "manual" }).returning(); await verifyPaymentAction(pp.id, "verified", "استلام نقدي"); }}>تأكيد الاستلام النقدي</ConfirmButton></div>}
          </Card>
        </div>
        <div className="no-print space-y-6">
          <Card title="تغيير حالة الطلب">
            <div className="flex flex-wrap gap-2">
              {flow.map((s) => <ConfirmButton key={s} variant={o.status === s ? "primary" : "outline"} message={`تغيير الحالة إلى "${ORDER_STATUSES[s].label}"؟`} onConfirm={async () => { "use server"; await updateOrderStatusAction(id, s); }}>{ORDER_STATUSES[s].label}</ConfirmButton>)}
              <ConfirmButton message="إلغاء الطلب؟ سيتم إلغاء العمولة المرتبطة." onConfirm={async () => { "use server"; await updateOrderStatusAction(id, "cancelled"); }}>إلغاء</ConfirmButton>
              <ConfirmButton variant="outline" message="تسجيل الطلب كمسترجع؟" onConfirm={async () => { "use server"; await updateOrderStatusAction(id, "returned"); }}>مسترجع</ConfirmButton>
            </div>
          </Card>
          <Card title="الشحن والتتبع">
            <ActionForm action={updateOrderShippingAction} submitLabel="تحديث"><input type="hidden" name="id" value={id} /><Input label="شركة الشحن" name="carrier" defaultValue={o.shippingCarrier} /><Input label="رقم التتبع" name="tracking" defaultValue={o.trackingNumber} /><Textarea label="ملاحظات" name="notes" defaultValue={o.notes} rows={2} /></ActionForm>
          </Card>
          <Card title="سجل الطلب"><ul className="space-y-2 text-sm">{events.map(({ e, by }) => <li key={e.id} className="border-s-2 border-teal-500 ps-3"><p className="font-semibold">{ORDER_STATUSES[e.status]?.label ?? e.status}</p><p className="text-xs text-slate-400">{fmtDateTime(e.createdAt)} {by && `• ${by}`} {e.note && `• ${e.note}`}</p></li>)}</ul></Card>
        </div>
      </div>
    </div>
  );
}
