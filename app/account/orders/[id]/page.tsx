import { db } from "@/db";
import { orderEvents, orderItems, orders, paymentProviders, payments, storePaymentAccounts, stores } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, fmtDateTime, money } from "@/lib/utils";
import { PaymentProofForm } from "@/components/storefront/PaymentProofForm";
import { customerCancelOrderAction } from "@/actions/storefront";
export const dynamic = "force-dynamic";

export default async function MyOrder({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const [row] = await db.select({ o: orders, store: stores }).from(orders).innerJoin(stores, eq(stores.id, orders.storeId)).where(and(eq(orders.id, id), eq(orders.userId, user.id)));
  if (!row) notFound();
  const { o, store } = row;
  const [items, events, pays, accs] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(desc(orderEvents.id)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.id)),
    db.select({ a: storePaymentAccounts, p: paymentProviders }).from(storePaymentAccounts).innerJoin(paymentProviders, eq(paymentProviders.id, storePaymentAccounts.providerId)).where(and(eq(storePaymentAccounts.storeId, store.id), eq(storePaymentAccounts.isActive, true), eq(storePaymentAccounts.verificationStatus, "verified"))),
  ]);
  const needsProof = o.paymentMethod !== "cod" && ["unpaid", "rejected"].includes(o.paymentStatus) && !["cancelled", "returned"].includes(o.status);
  return (
    <div className="space-y-6">
      <PageHeader title={`الطلب ${o.orderNumber}`} description={`${store.name} • ${fmtDateTime(o.createdAt)}`} action={<><Badge className={PAYMENT_STATUSES[o.paymentStatus].color + " self-center"}>{PAYMENT_STATUSES[o.paymentStatus].label}</Badge><Badge className={ORDER_STATUSES[o.status].color + " self-center"}>{ORDER_STATUSES[o.status].label}</Badge></>} />
      <Card title="المنتجات"><ul className="divide-y text-sm">{items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.name} {i.variant && `(${i.variant})`} × {i.quantity}</span><span>{money(Number(i.price) * i.quantity, o.currency)}</span></li>)}</ul><div className="mt-3 space-y-1 border-t pt-3 text-sm"><p className="flex justify-between"><span>المجموع</span><span>{money(o.subtotal, o.currency)}</span></p><p className="flex justify-between"><span>الخصم</span><span>- {money(o.discount, o.currency)}</span></p><p className="flex justify-between"><span>الشحن</span><span>{money(o.shippingFee, o.currency)}</span></p><p className="flex justify-between text-lg font-black"><span>الإجمالي</span><span>{money(o.total, o.currency)}</span></p></div><p className="mt-3 text-xs text-slate-500">طريقة الدفع: {PAYMENT_METHODS[o.paymentMethod]} • التوصيل إلى: {o.city} - {o.address}{o.trackingNumber && ` • رقم التتبع: ${o.trackingNumber} (${o.shippingCarrier})`}</p></Card>
      {needsProof && <Card title="إثبات الدفع">{accs.length > 0 && <ul className="mb-3 grid gap-2 text-sm sm:grid-cols-2">{accs.map(({ a, p }) => <li key={a.id} className="rounded-xl bg-slate-50 p-3"><b>{p.name}</b> — {a.accountName}<br /><span className="font-mono">{a.accountNumber || a.walletNumber || a.walletPhone}</span></li>)}</ul>}<PaymentProofForm orderId={o.id} accounts={accs.map(({ a, p }) => ({ id: a.id, label: `${p.name} - ${a.accountName}` }))} /></Card>}
      {pays.length > 0 && <Card title="سجل المدفوعات"><ul className="divide-y text-sm">{pays.map((p) => <li key={p.id} className="flex justify-between py-2"><span className="font-mono text-xs">{p.reference} {p.transactionNumber && `• ${p.transactionNumber}`}</span><Badge className={p.status === "verified" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>{p.status === "verified" ? "تم التحقق" : p.status === "rejected" ? "مرفوض" : "قيد التحقق"}</Badge></li>)}</ul></Card>}
      <Card title="تتبع الطلب"><ul className="space-y-2 text-sm">{events.map((e) => <li key={e.id} className="border-s-2 border-teal-500 ps-3"><b>{ORDER_STATUSES[e.status]?.label ?? e.status}</b> <span className="text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>{e.note && <p className="text-xs text-slate-500">{e.note}</p>}</li>)}</ul>{["new", "confirming"].includes(o.status) && <div className="mt-4"><ConfirmButton message="إلغاء الطلب؟" onConfirm={async () => { "use server"; await customerCancelOrderAction(id); }}>إلغاء الطلب</ConfirmButton></div>}</Card>
    </div>
  );
}
