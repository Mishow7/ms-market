import { db } from "@/db";
import { domains, plans, subscriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { addDomainAction, deleteDomainAction, setPrimaryDomainAction, verifyDomainAction } from "@/actions/store";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { Badge, Card, Input, PageHeader } from "@/components/ui";
import { DOMAIN_STATUSES, fmtDateTime } from "@/lib/utils";
import { dnsInstructions } from "@/lib/domains";
export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const { store } = await requireStore("settings");
  const [rows, [sub]] = await Promise.all([db.select().from(domains).where(eq(domains.storeId, store.id)).orderBy(desc(domains.isPrimary), domains.id), db.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq(plans.id, subscriptions.planId)).where(eq(subscriptions.storeId, store.id)).orderBy(desc(subscriptions.id)).limit(1)]);
  return (
    <div className="space-y-6">
      <PageHeader title="الدومينات" description="رابطك الفرعي المجاني ودوميناتك الخاصة. لا يُفعّل الدومين الخاص قبل التحقق من الملكية (TXT) والتوجيه (CNAME/A) ثم إصدار SSL من إدارة المنصة." />
      <div className="space-y-4">
        {rows.map((d) => (
          <Card key={d.id} title={<span className="font-mono">{d.hostname} {d.isPrimary && <Badge className="bg-amber-100 text-amber-700">الدومين الأساسي</Badge>}</span>} action={<div className="flex items-center gap-2"><Badge className={DOMAIN_STATUSES[d.status].color}>{DOMAIN_STATUSES[d.status].label}</Badge><Badge className={d.sslStatus === "issued" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}>🔒 SSL: {d.sslStatus === "issued" ? "مفعل" : d.sslStatus === "pending" ? "قيد الإصدار" : "غير مفعل"}</Badge></div>}>
            {d.type === "subdomain" ? <p className="text-sm text-slate-500">الرابط الفرعي المجاني لمتجرك. يعمل دائماً مع HTTPS.</p> : (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600">أضف السجلات التالية في لوحة DNS لدى مزود الدومين:</p>
                <div className="overflow-x-auto rounded-xl border"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-2 text-start">النوع</th><th className="p-2 text-start">المضيف</th><th className="p-2 text-start">القيمة</th><th className="p-2 text-start">الغرض</th><th className="p-2">الحالة</th></tr></thead><tbody>
                  {dnsInstructions(d.hostname, d.verificationToken).map((r) => <tr key={r.type} className="border-t"><td className="p-2 font-bold">{r.type}</td><td className="p-2 font-mono">{r.host}</td><td className="p-2 font-mono break-all">{r.value}</td><td className="p-2">{r.note}</td><td className="p-2 text-center">{r.type === "TXT" ? (d.dnsChecks.txt ? "✅" : "⏳") : r.type === "CNAME" ? (d.dnsChecks.cname ? "✅" : "⏳") : d.dnsChecks.a ? "✅" : "⏳"}</td></tr>)}
                </tbody></table></div>
                {d.lastError && <p className="rounded-lg bg-rose-50 p-2 text-rose-700">⚠️ {d.lastError}</p>}
                {d.status === "verified" && <p className="rounded-lg bg-blue-50 p-2 text-blue-700">تم التحقق من الملكية. بانتظار التفعيل النهائي وإصدار شهادة SSL من إدارة المنصة.</p>}
                <p className="text-xs text-slate-400">آخر فحص: {fmtDateTime(d.lastCheckedAt)}</p>
                <div className="flex flex-wrap gap-2">
                  <ConfirmButton variant="primary" message="فحص سجلات DNS الآن؟" onConfirm={async () => { "use server"; await verifyDomainAction(d.id); }}>🔄 تحقق الآن</ConfirmButton>
                  {d.status === "active" && !d.isPrimary && <ConfirmButton variant="outline" message="جعل هذا الدومين أساسياً؟ ستُحوّل الدومينات الأخرى إليه." onConfirm={async () => { "use server"; await setPrimaryDomainAction(d.id); }}>تعيين كأساسي</ConfirmButton>}
                  <ConfirmButton message="حذف الدومين؟" onConfirm={async () => { "use server"; await deleteDomainAction(d.id); }}>حذف</ConfirmButton>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Card title="إضافة دومين خاص">
        {sub && !sub.plan.allowCustomDomain ? <p className="text-sm text-amber-700">ربط دومين خاص غير متاح في باقتك الحالية ({sub.plan.name}). قم بترقية الباقة.</p> : (
          <ActionForm action={addDomainAction} submitLabel="إضافة الدومين" resetOnSuccess><Input label="الدومين" name="hostname" placeholder="www.mystore.com" required hint="لا يمكن ربط الدومين بأكثر من متجر" /></ActionForm>
        )}
      </Card>
    </div>
  );
}
