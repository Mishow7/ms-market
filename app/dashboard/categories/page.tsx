import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/store";
import { ActionForm, ConfirmButton, Modal } from "@/components/ui/client";
import { Button, Card, Input, PageHeader, Select, Table } from "@/components/ui";
export const dynamic = "force-dynamic";

export default async function Categories() {
  const { store } = await requireStore("products");
  const rows = await db.select({ c: categories, pc: count(products.id) }).from(categories).leftJoin(products, eq(products.categoryId, categories.id)).where(eq(categories.storeId, store.id)).groupBy(categories.id).orderBy(categories.sortOrder, categories.id);
  const parents = rows.filter((r) => !r.c.parentId).map((r) => ({ value: r.c.id, label: r.c.name }));
  const Form = ({ c }: { c?: typeof categories.$inferSelect }) => (
    <ActionForm action={saveCategoryAction} resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><Input label="الاسم" name="name" defaultValue={c?.name} required /><Select label="التصنيف الأب" name="parentId" defaultValue={c?.parentId ?? ""} options={[{ value: "", label: "رئيسي" }, ...parents.filter((p) => p.value !== c?.id)]} /><Input label="رابط صورة" name="image" defaultValue={c?.image} /><Input label="الترتيب" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} /></div>
    </ActionForm>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-3"><PageHeader title="التصنيفات" description="تصنيفات رئيسية وفرعية لمنتجات متجرك" /></div>
      <div className="lg:col-span-2">
        <Table headers={["التصنيف", "الأب", "المنتجات", ""]}>
          {rows.map(({ c, pc }) => <tr key={c.id}><td className="px-4 py-3 font-bold">{c.parentId ? "↳ " : ""}{c.name}</td><td className="px-4 py-3">{rows.find((r) => r.c.id === c.parentId)?.c.name ?? "-"}</td><td className="px-4 py-3">{pc}</td><td className="px-4 py-3"><div className="flex gap-1"><Modal title="تعديل التصنيف" trigger={<Button size="sm" variant="outline">تعديل</Button>}><Form c={c} /></Modal><ConfirmButton onConfirm={async () => { "use server"; await deleteCategoryAction(c.id); }}>حذف</ConfirmButton></div></td></tr>)}
        </Table>
      </div>
      <Card title="إضافة تصنيف"><Form /></Card>
    </div>
  );
}
