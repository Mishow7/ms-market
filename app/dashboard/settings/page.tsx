import { db } from "@/db";
import { storeCategories } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { saveStoreSettingsAction } from "@/actions/store";
import { ActionForm, ImageUploader } from "@/components/ui/client";
import { Card, Input, PageHeader, Select, Textarea } from "@/components/ui";
export const dynamic = "force-dynamic";

export default async function Settings() {
  const { store } = await requireStore("settings");
  const cats = await db.select().from(storeCategories);
  return (
    <div>
      <PageHeader title="إعدادات المتجر" description="الهوية البصرية وبيانات الاتصال" />
      <ActionForm action={saveStoreSettingsAction}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="البيانات الأساسية"><div className="space-y-4"><Input label="اسم المتجر" name="name" defaultValue={store.name} required /><Input label="اسم المالك" name="ownerName" defaultValue={store.ownerName} /><Textarea label="وصف المتجر" name="description" defaultValue={store.description} /><Select label="التصنيف" name="categoryId" defaultValue={store.categoryId ?? ""} options={[{ value: "", label: "بدون" }, ...cats.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))]} /><Select label="العملة" name="currency" defaultValue={store.currency} options={[{ value: "YER", label: "ريال يمني" }, { value: "SAR", label: "ريال سعودي" }, { value: "USD", label: "دولار أمريكي" }]} /></div></Card>
          <Card title="الاتصال والموقع"><div className="space-y-4"><Input label="البريد الإلكتروني" name="email" defaultValue={store.email} /><Input label="رقم الهاتف" name="phone" defaultValue={store.phone} /><div className="grid gap-4 sm:grid-cols-2"><Input label="الدولة" name="country" defaultValue={store.country} /><Input label="المدينة" name="city" defaultValue={store.city} /></div><div className="grid gap-3 sm:grid-cols-2"><Input label="فيسبوك" name="social_facebook" defaultValue={store.socials.facebook} /><Input label="إنستغرام" name="social_instagram" defaultValue={store.socials.instagram} /><Input label="واتساب" name="social_whatsapp" defaultValue={store.socials.whatsapp} /><Input label="تيك توك" name="social_tiktok" defaultValue={store.socials.tiktok} /></div></div></Card>
          <Card title="الهوية البصرية"><div className="space-y-4"><ImageUploader name="logo" label="الشعار" defaultValue={store.logo} /><ImageUploader name="cover" label="صورة الغلاف" defaultValue={store.cover} /><ImageUploader name="banner" label="البنر الرئيسي" defaultValue={store.banner} /><ImageUploader name="extraBanners" label="بنرات إضافية" defaultValue={store.extraBanners} multiple /><div className="grid grid-cols-2 gap-4"><Input label="اللون الأساسي" name="primary" type="color" defaultValue={store.colors.primary} /><Input label="اللون الثانوي" name="secondary" type="color" defaultValue={store.colors.secondary} /></div></div></Card>
        </div>
      </ActionForm>
    </div>
  );
}
