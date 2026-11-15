import { db } from "@/db";
import { paymentProviders, storePaymentAccounts, storePaymentMethods } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { deletePaymentAccountAction, savePaymentAccountAction, savePaymentMethodsAction } from "@/actions/store";
import { ActionForm, ConfirmButton, ImageUploader, Modal } from "@/components/ui/client";
import { Badge, Button, Card, Checkbox, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { PAYMENT_METHODS } from "@/lib/utils";
export const dynamic = "force-dynamic";

export default async function Finance() {
  const { store } = await requireStore("finance");
  const [providers, accounts, methods] = await Promise.all([
    db.select().from(paymentProviders).where(eq(paymentProviders.isActive, true)).orderBy(paymentProviders.type, paymentProviders.name),
    db.select({ a: storePaymentAccounts, p: paymentProviders }).from(storePaymentAccounts).innerJoin(paymentProviders, eq(paymentProviders.id, storePaymentAccounts.providerId)).where(eq(storePaymentAccounts.storeId, store.id)),
    db.select().from(storePaymentMethods).where(and(eq(storePaymentMethods.storeId, store.id))),
  ]);
  const m = (k: string) => methods.find((x) => x.method === k);
  const AccountForm = ({ a }: { a?: typeof storePaymentAccounts.$inferSelect }) => (
    <ActionForm action={savePaymentAccountAction} resetOnSuccess={!a}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="البنك / المحفظة" name="providerId" defaultValue={a?.providerId} options={[{ value: "", label: "اختر" }, ...providers.map((p) => ({ value: p.id, label: `${p.type === "bank" ? "🏦" : p.type === "wallet" ? "📱" : "🌐"} ${p.name}` }))]} required />
        <Input label="اسم صاحب الحساب" name="accountName" defaultValue={a?.accountName} required />
        <Input label="رقم الحساب البنكي" name="accountNumber" defaultValue={a?.accountNumber} /><Input label="IBAN (إن وجد)" name="iban" defaultValue={a?.iban} />
        <Input label="رقم المحفظة" name="walletNumber" defaultValue={a?.walletNumber} /><Input label="هاتف المحفظة" name="walletPhone" defaultValue={a?.walletPhone} />
        <Select label="العملة" name="currency" defaultValue={a?.currency ?? store.currency} options={[{ value: "YER", label: "ريال يمني" }, { value: "SAR", label: "ريال سعودي" }, { value: "USD", label: "دولار" }]} />
      </div>
      <ImageUploader name="proofUrl" label="إثبات ملكية الحساب (صورة/PDF)" defaultValue={a?.proofUrl} />
      <Checkbox label="الحساب مفعل للاستقبال" name="isActive" defaultChecked={a?.isActive ?? true} />
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="الحسابات المالية ووسائل الدفع" description="تصل أموال العملاء مباشرة إلى حساباتك. البيانات محمية ولا تُعرض للمتاجر الأخرى." action={<Modal title="إضافة حساب مالي" trigger={<Button>+ حساب بنكي / محفظة</Button>}><AccountForm /></Modal>} />
      <Table headers={["المزود", "صاحب الحساب", "رقم الحساب / المحفظة", "العملة", "التوثيق", "الحالة", ""]}>
        {accounts.map(({ a, p }) => <tr key={a.id}><td className="px-4 py-3 font-bold">{p.name} <span className="text-xs text-slate-400">({p.type === "bank" ? "بنك" : p.type === "wallet" ? "محفظة" : "بوابة"})</span></td><td className="px-4 py-3">{a.accountName}</td><td className="px-4 py-3 font-mono text-xs">{a.accountNumber || a.walletNumber || a.walletPhone}{a.iban && <><br />{a.iban}</>}</td><td className="px-4 py-3">{a.currency}</td><td className="px-4 py-3"><Badge className={a.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700" : a.verificationStatus === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>{a.verificationStatus === "verified" ? "موثق" : a.verificationStatus === "rejected" ? "مرفوض" : "قيد المراجعة"}</Badge></td><td className="px-4 py-3">{a.isActive ? "مفعل" : "معطل"}</td><td className="px-4 py-3"><div className="flex gap-1"><Modal title="تعديل الحساب" trigger={<Button size="sm" variant="outline">تعديل</Button>}><AccountForm a={a} /></Modal><ConfirmButton onConfirm={async () => { "use server"; await deletePaymentAccountAction(a.id); }}>حذف</ConfirmButton></div></td></tr>)}
        {accounts.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">لم تضف أي حساب مالي بعد</td></tr>}
      </Table>
      <Card title="وسائل الدفع المتاحة للعملاء">
        <ActionForm action={savePaymentMethodsAction}>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
              <div key={k} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between"><p className="font-bold">{label}</p><Checkbox label="مفعل" name={`${k}_enabled`} defaultChecked={m(k)?.isEnabled} /></div>
                {k === "gateway" && <p className="mt-1 text-xs text-amber-600">لن تُعتمد المدفوعات آلياً إلا بعد تكامل رسمي مُختبر مع مزود البوابة. تعمل حالياً بالمراجعة اليدوية.</p>}
                <Textarea name={`${k}_instructions`} defaultValue={m(k)?.instructions} placeholder="تعليمات للعميل (مثلاً: حوّل إلى الحساب ثم أدخل رقم العملية)" rows={2} className="mt-2" />
                <Input name={`${k}_fee`} label="رسوم الوسيلة %" type="number" step="0.01" defaultValue={m(k)?.feePercent ?? 0} className="mt-2" />
              </div>
            ))}
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
