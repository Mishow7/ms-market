import { db } from "@/db";
import { commissions, domains, orders, plans, products, storeCategories, stores, subscriptions, users, storePaymentAccounts, paymentProviders } from "@/db/schema";
import { count, desc, eq, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import { adminDeleteStoreAction, adminUpdateStoreAction, adminUpdateStoreStatusAction } from "@/actions/admin";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { Badge, Button, Card, Checkbox, Input, PageHeader, Select, StatCard } from "@/components/ui";
import { DOMAIN_STATUSES, STORE_STATUSES, fmtDate, money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminStoreDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [store] = await db.select().from(stores).where(eq(stores.id, id));
  if (!store) notFound();
  const [[owner], [sub], planRows, cats, [pc], [oc], [sales], [comm], doms, accounts] = await Promise.all([
    db.select().from(users).where(eq(users.id, store.ownerId)),
    db.select({ sub: subscriptions, plan: plans }).from(subscriptions).innerJoin(plans, eq(plans.id, subscriptions.planId)).where(eq(subscriptions.storeId, id)).orderBy(desc(subscriptions.id)).limit(1),
    db.select().from(plans),
    db.select().from(storeCategories),
    db.select({ c: count() }).from(products).where(eq(products.storeId, id)),
    db.select({ c: count() }).from(orders).where(eq(orders.storeId, id)),
    db.select({ s: sum(orders.total) }).from(orders).where(eq(orders.storeId, id)),
    db.select({ s: sum(commissions.amount) }).from(commissions).where(eq(commissions.storeId, id)),
    db.select().from(domains).where(eq(domains.storeId, id)),
    db.select({ a: storePaymentAccounts, p: paymentProviders.name }).from(storePaymentAccounts).innerJoin(paymentProviders, eq(paymentProviders.id, storePaymentAccounts.providerId)).where(eq(storePaymentAccounts.storeId, id)),
  ]);
  const setStatus = async (status: string) => { "use server"; await adminUpdateStoreStatusAction(id, status); };
  return (
    <div className="space-y-6">
      <PageHeader title={store.name} description={`/${store.slug} • المالك: ${owner?.name} (${owner?.email})`} action={<><Button href={`/s/${store.slug}`} variant="outline">معاينة المتجر</Button><Badge className={STORE_STATUSES[store.status].color + " self-center"}>{STORE_STATUSES[store.status].label}</Badge></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="المنتجات" value={pc.c} icon="📦" /><StatCard label="الطلبات" value={oc.c} icon="🧾" tone="indigo" /><StatCard label="إجمالي المبيعات" value={money(sales.s, store.currency)} icon="💵" tone="emerald" /><StatCard label="عمولات المنصة" value={money(comm.s, store.currency)} icon="💰" tone="amber" />
      </div>
      <Card title="حالة المتجر">
        <div className="flex flex-wrap gap-2">
          {store.status !== "active" && <ConfirmButton variant="primary" message="تفعيل المتجر؟" onConfirm={setStatus.bind(null, "active")}>✅ تفعيل</ConfirmButton>}
          {store.status === "active" && <ConfirmButton message="تعليق المتجر سيمنع الوصول إلى واجهته." onConfirm={setStatus.bind(null, "suspended")}>⛔ تعليق</ConfirmButton>}
          {store.status === "pending" && <ConfirmButton variant="outline" message="رفض طلب المتجر؟" onConfirm={setStatus.bind(null, "rejected")}>رفض</ConfirmButton>}
          <ConfirmButton variant="outline" message="تحديد كمنتهي الاشتراك؟" onConfirm={setStatus.bind(null, "expired")}>منتهي الاشتراك</ConfirmButton>
          <ConfirmButton message="حذف المتجر نهائياً مع جميع بياناته (منتجات، طلبات، عملاء)؟" onConfirm={async () => { "use server"; await adminDeleteStoreAction(id); }}>🗑 حذف المتجر</ConfirmButton>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="الاشتراك والعمولة والتمييز">
          <ActionForm action={adminUpdateStoreAction}>
            <input type="hidden" name="id" value={id} />
            <p className="text-sm text-slate-500">الباقة الحالية: <b>{sub?.plan.name ?? "-"}</b> • تنتهي {fmtDate(sub?.sub.endsAt)} • الحالة {sub?.sub.status}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="تغيير/تجديد الباقة" name="planId" options={[{ value: "", label: "بدون تغيير" }, ...planRows.map((p) => ({ value: p.id, label: `${p.name} (${p.commissionPercent}%)` }))]} />
              <Select label="دورة الفوترة" name="billingCycle" options={[{ value: "monthly", label: "شهري" }, { value: "yearly", label: "سنوي" }]} />
              <Select label="نوع العمولة الخاصة" name="commissionType" defaultValue={store.commissionType ?? ""} options={[{ value: "", label: "حسب الباقة" }, { value: "percent", label: "نسبة مئوية" }, { value: "fixed", label: "مبلغ ثابت لكل طلب" }]} />
              <Input label="قيمة العمولة الخاصة" name="commissionValue" type="number" step="0.01" defaultValue={store.commissionValue ?? ""} />
              <Select label="تصنيف المتجر" name="categoryId" defaultValue={store.categoryId ?? ""} options={[{ value: "", label: "بدون" }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
            <Checkbox label="متجر مميز (يظهر في الصفحة الرئيسية)" name="isFeatured" defaultChecked={store.isFeatured} />
          </ActionForm>
        </Card>
        <Card title="الدومينات">
          <ul className="divide-y divide-slate-100 text-sm">{doms.map((d) => <li key={d.id} className="flex items-center justify-between py-2"><span className="font-mono">{d.hostname} {d.isPrimary && "⭐"}</span><Badge className={DOMAIN_STATUSES[d.status].color}>{DOMAIN_STATUSES[d.status].label}</Badge></li>)}</ul>
          <h4 className="mt-5 mb-2 font-bold">الحسابات المالية</h4>
          <ul className="divide-y divide-slate-100 text-sm">{accounts.map(({ a, p }) => <li key={a.id} className="flex items-center justify-between py-2"><span>{p} - {a.accountName}</span><Badge className={a.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{a.verificationStatus === "verified" ? "موثق" : a.verificationStatus === "rejected" ? "مرفوض" : "بانتظار التوثيق"}</Badge></li>)}{accounts.length === 0 && <li className="py-2 text-slate-400">لا توجد حسابات</li>}</ul>
        </Card>
      </div>
    </div>
  );
}
