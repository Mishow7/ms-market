import { requireUser } from "@/lib/auth";
import { updateProfileAction } from "@/actions/auth";
import { ActionForm } from "@/components/ui/client";
import { Card, Input, PageHeader, Select } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Profile() {
  const u = await requireUser();
  return <div><PageHeader title="حسابي" /><Card><ActionForm action={updateProfileAction}><Input label="الاسم" name="name" defaultValue={u.name} /><Input label="البريد" name="email" defaultValue={u.email} /><Input label="الهاتف" name="phone" defaultValue={u.phone} /><Input label="كلمة مرور جديدة (اختياري)" name="password" type="password" /><Select label="اللغة" name="locale" defaultValue={u.locale} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} /></ActionForm></Card></div>;
}
