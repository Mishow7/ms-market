import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { deleteCouponAction, saveCouponAction } from "@/actions/store";
import { ActionForm, ConfirmButton, Modal } from "@/components/ui/client";
import { Badge, Button, Checkbox, Input, PageHeader, Select, Table } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
export const dynamic = "force-dynamic";

export default async function Coupons() {
  const { store } = await requireStore("marketing");
  const rows = await db.select().from(coupons).where(eq(coupons.storeId, store.id)).orderBy(desc(coupons.id));
  const Form = ({ c }: { c?: typeof coupons.$inferSelect }) => (
    <ActionForm action={saveCouponAction} resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><Input label="الكود" name="code" defaultValue={c?.code} required /><Select label="النوع" name="type" defaultValue={c?.type} options={[{ value: "percent", label: "نسبة مئوية %" }, { value: "fixed", label: "مبلغ ثابت" }]} /><Input label="القيمة" name="value" type="number" step="0.01" defaultValue={c?.value} required /><Input label="الحد الأدنى للطلب" name="minOrder" type="number" defaultValue={c?.minOrder} /><Input label="الحد الأقصى للاستخدام" name="maxUses" type="number" defaultValue={c?.maxUses} /><Input label="تاريخ الانتهاء" name="expiresAt" type="date" defaultValue={c?.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : ""} /><Input label="معرّفات منتجات محددة (اختياري، مفصولة بفاصلة)" name="productIds" defaultValue={c?.productIds.join(",")} /><Input label="معرّفات تصنيفات محددة" name="categoryIds" defaultValue={c?.categoryIds.join(",")} /></div>
      <Checkbox label="مفعل" name="isActive" defaultChecked={c?.isActive ?? true} />
    </ActionForm>
  );
  return (
    <div>
      <PageHeader title="كوبونات الخصم" action={<Modal title="كوبون جديد" trigger={<Button>+ كوبون</Button>}><Form /></Modal>} />
      <Table headers={["الكود", "الخصم", "الحد الأدنى", "الاستخدام", "الانتهاء", "الحالة", ""]}>
        {rows.map((c) => <tr key={c.id}><td className="px-4 py-3 font-mono font-bold">{c.code}</td><td className="px-4 py-3">{c.type === "percent" ? `${c.value}%` : `${c.value} ${store.currency}`}</td><td className="px-4 py-3">{c.minOrder}</td><td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td><td className="px-4 py-3">{fmtDate(c.expiresAt)}</td><td className="px-4 py-3"><Badge className={c.isActive && (!c.expiresAt || c.expiresAt > new Date()) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200"}>{c.isActive && (!c.expiresAt || c.expiresAt > new Date()) ? "فعال" : "منتهي/معطل"}</Badge></td><td className="px-4 py-3"><div className="flex gap-1"><Modal title="تعديل" trigger={<Button size="sm" variant="outline">تعديل</Button>}><Form c={c} /></Modal><ConfirmButton onConfirm={async () => { "use server"; await deleteCouponAction(c.id); }}>حذف</ConfirmButton></div></td></tr>)}
        {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">لا توجد كوبونات</td></tr>}
      </Table>
    </div>
  );
}
