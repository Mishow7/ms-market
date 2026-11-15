import { db } from "@/db";
import { shippingMethods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { deleteShippingAction, saveShippingAction } from "@/actions/store";
import { ActionForm, ConfirmButton, Modal } from "@/components/ui/client";
import { Badge, Button, Checkbox, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { money } from "@/lib/utils";
export const dynamic = "force-dynamic";
const TYPES: Record<string, string> = { free: "شحن مجاني", flat: "سعر ثابت", city: "حسب المدينة/المنطقة", weight: "حسب الوزن", pickup: "الاستلام من المتجر" };

export default async function Shipping() {
  const { store } = await requireStore("settings");
  const rows = await db.select().from(shippingMethods).where(eq(shippingMethods.storeId, store.id));
  const Form = ({ s }: { s?: typeof shippingMethods.$inferSelect }) => (
    <ActionForm action={saveShippingAction} resetOnSuccess={!s}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><Input label="الاسم" name="name" defaultValue={s?.name} required /><Select label="النوع" name="type" defaultValue={s?.type} options={Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v }))} /><Input label="السعر الأساسي" name="price" type="number" step="0.01" defaultValue={s?.price} /><Input label="مدة التوصيل" name="eta" defaultValue={s?.eta} placeholder="2-4 أيام" /><Input label="شركة الشحن" name="carrier" defaultValue={s?.carrier} className="sm:col-span-2" /></div>
      <Textarea label='قواعد الأسعار (JSON) — مثال: [{"city":"صنعاء","price":"1000"},{"city":"عدن","price":"2000"}] أو [{"maxWeight":5,"price":"1500"}]' name="rules" defaultValue={JSON.stringify(s?.rules ?? [])} rows={3} />
      <Checkbox label="مفعل" name="isActive" defaultChecked={s?.isActive ?? true} />
    </ActionForm>
  );
  return (
    <div>
      <PageHeader title="الشحن والتوصيل" description="حدد طرق الشحن وأسعارها حسب المدينة أو الوزن، ومدة التوصيل" action={<Modal title="طريقة شحن جديدة" trigger={<Button>+ إضافة</Button>}><Form /></Modal>} />
      <Table headers={["الاسم", "النوع", "السعر", "القواعد", "المدة", "الشركة", "الحالة", ""]}>
        {rows.map((s) => <tr key={s.id}><td className="px-4 py-3 font-bold">{s.name}</td><td className="px-4 py-3">{TYPES[s.type]}</td><td className="px-4 py-3">{money(s.price, store.currency)}</td><td className="px-4 py-3 text-xs">{s.rules.map((r, i) => <span key={i} className="me-2 rounded bg-slate-100 px-1.5 py-0.5">{r.city ?? (r.maxWeight != null ? `≤${r.maxWeight}كجم` : "")}: {r.price}</span>)}</td><td className="px-4 py-3">{s.eta}</td><td className="px-4 py-3">{s.carrier}</td><td className="px-4 py-3"><Badge className={s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200"}>{s.isActive ? "مفعل" : "معطل"}</Badge></td><td className="px-4 py-3"><div className="flex gap-1"><Modal title="تعديل" trigger={<Button size="sm" variant="outline">تعديل</Button>}><Form s={s} /></Modal><ConfirmButton onConfirm={async () => { "use server"; await deleteShippingAction(s.id); }}>حذف</ConfirmButton></div></td></tr>)}
        {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">أضف طريقة شحن واحدة على الأقل ليتمكن العملاء من إتمام الطلب</td></tr>}
      </Table>
    </div>
  );
}
