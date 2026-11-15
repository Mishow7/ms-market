import { db } from "@/db";
import { plans, storeCategories } from "@/db/schema";
import { adminCreateStoreAction } from "@/actions/admin";
import { ActionForm } from "@/components/ui/client";
import { Card, Input, PageHeader, Select, Textarea } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewStore() {
  const [p, c] = await Promise.all([db.select().from(plans), db.select().from(storeCategories)]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="إنشاء متجر جديد" description="يتم تفعيل المتجر فوراً وإنشاء حساب المالك إن لم يكن موجوداً" />
      <Card>
        <ActionForm action={adminCreateStoreAction} submitLabel="إنشاء المتجر">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="اسم المتجر" name="name" required />
            <Input label="رابط المتجر (slug)" name="slug" placeholder="mystore" />
            <Input label="بريد المالك" name="ownerEmail" type="email" required />
            <Input label="اسم المالك (للحساب الجديد)" name="ownerName" />
            <Input label="كلمة مرور المالك (للحساب الجديد)" name="ownerPassword" type="password" />
            <Input label="هاتف المالك" name="ownerPhone" />
            <Input label="هاتف المتجر" name="phone" />
            <Input label="المدينة" name="city" />
            <Select label="التصنيف" name="categoryId" options={[{ value: "", label: "بدون" }, ...c.map((x) => ({ value: x.id, label: x.name }))]} />
            <Select label="الباقة" name="planId" options={p.map((x) => ({ value: x.id, label: x.name }))} />
            <Select label="العملة" name="currency" options={[{ value: "YER", label: "ريال يمني" }, { value: "SAR", label: "ريال سعودي" }, { value: "USD", label: "دولار" }]} />
          </div>
          <Textarea label="الوصف" name="description" />
        </ActionForm>
      </Card>
    </div>
  );
}
