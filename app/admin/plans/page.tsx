import { db } from "@/db";
import { plans } from "@/db/schema";
import { adminDeletePlanAction, adminSavePlanAction } from "@/actions/admin";
import { ActionForm, ConfirmButton, Modal } from "@/components/ui/client";
import { Badge, Button, Card, Checkbox, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

function PlanForm({ p }: { p?: typeof plans.$inferSelect }) {
  return (
    <ActionForm action={adminSavePlanAction}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="الاسم" name="name" defaultValue={p?.name} required /><Input label="المعرف (slug)" name="slug" defaultValue={p?.slug} />
        <Input label="السعر الشهري" name="priceMonthly" type="number" step="0.01" defaultValue={p?.priceMonthly} /><Input label="السعر السنوي" name="priceYearly" type="number" step="0.01" defaultValue={p?.priceYearly} />
        <Select label="العملة" name="currency" defaultValue={p?.currency} options={[{ value: "YER", label: "YER" }, { value: "SAR", label: "SAR" }, { value: "USD", label: "USD" }]} /><Input label="مدة الاشتراك (أيام)" name="durationDays" type="number" defaultValue={p?.durationDays ?? 30} />
        <Input label="عدد المنتجات" name="maxProducts" type="number" defaultValue={p?.maxProducts ?? 50} /><Input label="عدد الموظفين" name="maxStaff" type="number" defaultValue={p?.maxStaff ?? 1} />
        <Input label="عدد القوالب" name="maxThemes" type="number" defaultValue={p?.maxThemes ?? 1} /><Input label="التخزين (MB)" name="storageMb" type="number" defaultValue={p?.storageMb ?? 500} />
        <Input label="نسبة العمولة %" name="commissionPercent" type="number" step="0.01" defaultValue={p?.commissionPercent ?? 5} /><Input label="الترتيب" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} />
      </div>
      <Textarea label="الوصف" name="description" defaultValue={p?.description} rows={2} />
      <div className="flex flex-wrap gap-4"><Checkbox label="ربط دومين خاص" name="allowCustomDomain" defaultChecked={p?.allowCustomDomain} /><Checkbox label="أدوات التسويق" name="allowMarketing" defaultChecked={p?.allowMarketing} /><Checkbox label="التقارير" name="allowReports" defaultChecked={p?.allowReports ?? true} /><Checkbox label="مفعلة" name="isActive" defaultChecked={p?.isActive ?? true} /></div>
    </ActionForm>
  );
}

export default async function Plans() {
  const rows = await db.select().from(plans).orderBy(plans.sortOrder);
  return (
    <div>
      <PageHeader title="الباقات" description="تحديد خصائص وحدود وعمولة كل باقة" action={<Modal title="باقة جديدة" trigger={<Button>+ باقة جديدة</Button>}><PlanForm /></Modal>} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((p) => (
          <Card key={p.id} title={<span>{p.name} {!p.isActive && <Badge className="bg-slate-200">معطلة</Badge>}</span>}>
            <p className="text-2xl font-black text-teal-700">{money(p.priceMonthly, p.currency)}<span className="text-xs text-slate-400">/شهر</span></p>
            <p className="text-xs text-slate-400">{money(p.priceYearly, p.currency)}/سنة</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600"><li>📦 {p.maxProducts} منتج</li><li>👥 {p.maxStaff} موظف</li><li>🎨 {p.maxThemes} قالب</li><li>💾 {p.storageMb} MB</li><li>{p.allowCustomDomain ? "✅" : "❌"} دومين خاص</li><li>{p.allowMarketing ? "✅" : "❌"} تسويق</li><li>💰 عمولة {p.commissionPercent}%</li><li>⏱ {p.durationDays} يوم</li></ul>
            <div className="mt-4 flex gap-2">
              <Modal title={`تعديل ${p.name}`} trigger={<Button size="sm" variant="outline">تعديل</Button>}><PlanForm p={p} /></Modal>
              <ConfirmButton onConfirm={async () => { "use server"; await adminDeletePlanAction(p.id); }}>حذف</ConfirmButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
