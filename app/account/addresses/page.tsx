import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { deleteAddressAction, saveAddressAction } from "@/actions/storefront";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { Card, Checkbox, Input, PageHeader } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Addresses() {
  const user = await requireUser();
  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2"><PageHeader title="عناويني" /></div>
      <div className="space-y-3">{rows.map((a) => <div key={a.id} className="rounded-2xl border bg-white p-4"><p className="font-bold">{a.label} {a.isDefault && "⭐"}</p><p className="text-sm text-slate-600">{a.city} {a.area} {a.street}</p><p className="text-xs text-slate-400">{a.phone}</p><div className="mt-2"><ConfirmButton onConfirm={async () => { "use server"; await deleteAddressAction(a.id); }}>حذف</ConfirmButton></div></div>)}{rows.length === 0 && <p className="text-slate-400">لا توجد عناوين</p>}</div>
      <Card title="إضافة عنوان"><ActionForm action={saveAddressAction} resetOnSuccess><Input label="التسمية" name="label" placeholder="المنزل / العمل" /><Input label="المدينة" name="city" required /><Input label="المنطقة / الحي" name="area" /><Input label="الشارع / أقرب معلم" name="street" /><Input label="الهاتف" name="phone" /><Checkbox label="العنوان الافتراضي" name="isDefault" /></ActionForm></Card>
    </div>
  );
}
