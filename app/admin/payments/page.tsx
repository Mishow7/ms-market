import { db } from "@/db";
import { paymentProviders, storePaymentAccounts, stores } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminDeleteProviderAction, adminSaveProviderAction, adminVerifyAccountAction } from "@/actions/admin";
import { ActionForm, ConfirmButton, Modal, Tabs } from "@/components/ui/client";
import { Badge, Button, Checkbox, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
const TYPE: Record<string, string> = { bank: "بنك", wallet: "محفظة إلكترونية", gateway: "بوابة دفع" };

function ProviderForm({ p }: { p?: typeof paymentProviders.$inferSelect }) {
  return (
    <ActionForm action={adminSaveProviderAction}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="الاسم" name="name" defaultValue={p?.name} required /><Select label="النوع" name="type" defaultValue={p?.type} options={Object.entries(TYPE).map(([k, v]) => ({ value: k, label: v }))} />
        <Input label="الدولة" name="country" defaultValue={p?.country ?? "YE"} /><Input label="رابط الشعار" name="logo" defaultValue={p?.logo} />
      </div>
      <Textarea label="ملاحظات / حالة التكامل" name="notes" defaultValue={p?.notes} rows={2} />
      <div className="flex gap-4"><Checkbox label="يدعم تكامل API/Webhook (بعد اختبار رسمي)" name="supportsApi" defaultChecked={p?.supportsApi} /><Checkbox label="مفعل" name="isActive" defaultChecked={p?.isActive ?? true} /></div>
    </ActionForm>
  );
}

export default async function Payments() {
  const [providers, accounts] = await Promise.all([
    db.select().from(paymentProviders).orderBy(paymentProviders.type, paymentProviders.name),
    db.select({ a: storePaymentAccounts, store: stores.name, storeId: stores.id, provider: paymentProviders.name }).from(storePaymentAccounts).innerJoin(stores, eq(stores.id, storePaymentAccounts.storeId)).innerJoin(paymentProviders, eq(paymentProviders.id, storePaymentAccounts.providerId)).orderBy(desc(storePaymentAccounts.id)),
  ]);
  return (
    <div>
      <PageHeader title="وسائل الدفع ومزودو الخدمات المالية" description="قائمة البنوك والمحافظ اليمنية القابلة للإدارة دون تعديل برمجي، وتوثيق حسابات التجار" action={<Modal title="إضافة مزود" trigger={<Button>+ بنك / محفظة</Button>}><ProviderForm /></Modal>} />
      <Tabs tabs={[
        { label: `المزودون (${providers.length})`, content: (
          <Table headers={["الاسم", "النوع", "الدولة", "تكامل API", "الحالة", ""]}>
            {providers.map((p) => (
              <tr key={p.id}><td className="px-4 py-3 font-bold">{p.name}</td><td className="px-4 py-3">{TYPE[p.type]}</td><td className="px-4 py-3">{p.country}</td><td className="px-4 py-3">{p.supportsApi ? <Badge className="bg-emerald-100 text-emerald-700">متاح</Badge> : <Badge>يدوي</Badge>}</td><td className="px-4 py-3"><Badge className={p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{p.isActive ? "مفعل" : "موقوف"}</Badge></td>
              <td className="px-4 py-3"><div className="flex gap-2"><Modal title="تعديل" trigger={<Button size="sm" variant="outline">تعديل</Button>}><ProviderForm p={p} /></Modal><ConfirmButton onConfirm={async () => { "use server"; await adminDeleteProviderAction(p.id); }}>حذف</ConfirmButton></div></td></tr>
            ))}
          </Table>
        ) },
        { label: `حسابات التجار (${accounts.length})`, content: (
          <Table headers={["المتجر", "المزود", "صاحب الحساب", "الحساب / المحفظة", "الإثبات", "التوثيق", "", ""]}>
            {accounts.map(({ a, store, provider }) => (
              <tr key={a.id}><td className="px-4 py-3 font-bold">{store}</td><td className="px-4 py-3">{provider}</td><td className="px-4 py-3">{a.accountName}</td><td className="px-4 py-3 font-mono text-xs">{a.accountNumber || a.walletNumber || a.walletPhone} {a.iban && <><br />{a.iban}</>}</td><td className="px-4 py-3">{a.proofUrl ? <a href={a.proofUrl} target="_blank" className="text-teal-700 underline">عرض</a> : "-"}</td>
              <td className="px-4 py-3"><Badge className={a.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700" : a.verificationStatus === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>{a.verificationStatus === "verified" ? "موثق" : a.verificationStatus === "rejected" ? "مرفوض" : "بانتظار"}</Badge></td>
              <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(a.createdAt)}</td>
              <td className="px-4 py-3"><div className="flex gap-1">{a.verificationStatus !== "verified" && <ConfirmButton variant="primary" message="توثيق هذا الحساب؟" onConfirm={async () => { "use server"; await adminVerifyAccountAction(a.id, "verified"); }}>توثيق</ConfirmButton>}{a.verificationStatus !== "rejected" && <ConfirmButton message="رفض توثيق الحساب؟" onConfirm={async () => { "use server"; await adminVerifyAccountAction(a.id, "rejected"); }}>رفض</ConfirmButton>}</div></td></tr>
            ))}
          </Table>
        ) },
      ]} />
    </div>
  );
}
