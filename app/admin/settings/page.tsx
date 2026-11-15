import { db } from "@/db";
import { platformSettings, storeCategories } from "@/db/schema";
import { adminDeleteStoreCategoryAction, adminSaveSettingsAction, adminSaveStoreCategoryAction } from "@/actions/admin";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { Card, Checkbox, Input, PageHeader, Select } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const [rows, cats] = await Promise.all([db.select().from(platformSettings), db.select().from(storeCategories)]);
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2"><PageHeader title="إعدادات المنصة" description="الإعدادات العامة وتصنيفات المتاجر" /></div>
      <Card title="الإعدادات العامة">
        <ActionForm action={adminSaveSettingsAction}>
          <Input label="اسم المنصة" name="platform_name" defaultValue={s.platform_name ?? "MS Commerce"} />
          <Input label="الشعار النصي" name="platform_tagline" defaultValue={s.platform_tagline} />
          <Input label="بريد الدعم" name="support_email" defaultValue={s.support_email} />
          <Input label="هاتف الدعم" name="support_phone" defaultValue={s.support_phone} />
          <Input label="العمولة الافتراضية %" name="default_commission" type="number" step="0.01" defaultValue={s.default_commission ?? "5"} />
          <Select label="العملة الافتراضية" name="default_currency" defaultValue={s.default_currency ?? "YER"} options={[{ value: "YER", label: "ريال يمني" }, { value: "SAR", label: "ريال سعودي" }, { value: "USD", label: "دولار" }]} />
          <Checkbox label="الموافقة التلقائية على المتاجر الجديدة (بدون مراجعة)" name="auto_approve_stores" defaultChecked={s.auto_approve_stores === "true"} />
        </ActionForm>
      </Card>
      <Card title="تصنيفات المتاجر">
        <ul className="mb-4 divide-y divide-slate-100 text-sm">{cats.map((c) => <li key={c.id} className="flex items-center justify-between py-2"><span>{c.icon} {c.name}</span><ConfirmButton onConfirm={async () => { "use server"; await adminDeleteStoreCategoryAction(c.id); }}>حذف</ConfirmButton></li>)}</ul>
        <ActionForm action={adminSaveStoreCategoryAction} submitLabel="إضافة تصنيف" resetOnSuccess>
          <div className="grid gap-3 sm:grid-cols-3"><Input label="الاسم" name="name" required className="sm:col-span-2" /><Input label="أيقونة" name="icon" placeholder="🛍️" /></div>
        </ActionForm>
      </Card>
    </div>
  );
}
