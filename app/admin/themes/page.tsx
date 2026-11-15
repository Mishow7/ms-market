import { db } from "@/db";
import { plans, themes } from "@/db/schema";
import { adminDeleteThemeAction, adminSaveThemeAction } from "@/actions/admin";
import { ActionForm, ConfirmButton, Modal } from "@/components/ui/client";
import { Badge, Button, Checkbox, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { THEME_CATEGORIES, defaultThemeConfig } from "@/lib/themes";

export const dynamic = "force-dynamic";

function ThemeForm({ t, planRows }: { t?: typeof themes.$inferSelect; planRows: { id: number; name: string }[] }) {
  return (
    <ActionForm action={adminSaveThemeAction}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="اسم القالب" name="name" defaultValue={t?.name} required /><Input label="المعرف" name="slug" defaultValue={t?.slug} />
        <Select label="التصنيف" name="category" defaultValue={t?.category} options={Object.entries(THEME_CATEGORIES).map(([k, v]) => ({ value: k, label: v }))} /><Input label="الإصدار" name="version" defaultValue={t?.version ?? "1.0.0"} />
        <Input label="رابط صورة المعاينة" name="previewImage" defaultValue={t?.previewImage} className="sm:col-span-2" />
        <Input label="السعر" name="price" type="number" defaultValue={t?.price} /><Select label="الحد الأدنى للباقة" name="minPlanId" defaultValue={t?.minPlanId ?? ""} options={[{ value: "", label: "متاح للجميع" }, ...planRows.map((p) => ({ value: p.id, label: p.name }))]} />
      </div>
      <Textarea label="الوصف" name="description" defaultValue={t?.description} rows={2} />
      <Textarea label="إعدادات القالب (JSON: ألوان، خط، أقسام افتراضية)" name="config" defaultValue={JSON.stringify(t?.config ?? defaultThemeConfig(), null, 2)} rows={8} />
      <div className="flex gap-4"><Checkbox label="مدفوع" name="isPaid" defaultChecked={t?.isPaid} /><Checkbox label="مفعل" name="isActive" defaultChecked={t?.isActive ?? true} /></div>
    </ActionForm>
  );
}

export default async function Themes() {
  const [rows, planRows] = await Promise.all([db.select().from(themes).orderBy(themes.id), db.select({ id: plans.id, name: plans.name }).from(plans)]);
  return (
    <div>
      <PageHeader title="مكتبة القوالب" description="القوالب المتاحة للتجار مع تصنيفها وتسعيرها وربطها بالباقات" action={<Modal title="إضافة قالب" trigger={<Button>+ قالب جديد</Button>}><ThemeForm planRows={planRows} /></Modal>} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-36" style={{ background: t.previewImage ? `url(${t.previewImage}) center/cover` : `linear-gradient(135deg, ${t.config.primary}, ${t.config.secondary})` }} />
            <div className="p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">{t.name}</h3><div className="flex gap-1"><Badge>{THEME_CATEGORIES[t.category] ?? t.category}</Badge>{t.isPaid ? <Badge className="bg-amber-100 text-amber-700">مدفوع</Badge> : <Badge className="bg-emerald-100 text-emerald-700">مجاني</Badge>}{!t.isActive && <Badge className="bg-rose-100 text-rose-700">موقوف</Badge>}</div></div>
              <p className="mt-1 text-xs text-slate-500">{t.description} • v{t.version}</p>
              <div className="mt-3 flex gap-2">
                <Modal title={`تعديل ${t.name}`} trigger={<Button size="sm" variant="outline">تعديل</Button>}><ThemeForm t={t} planRows={planRows} /></Modal>
                <ConfirmButton onConfirm={async () => { "use server"; await adminDeleteThemeAction(t.id); }}>حذف</ConfirmButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
