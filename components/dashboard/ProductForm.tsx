"use client";
import { useActionState, useState } from "react";
import { saveProductAction } from "@/actions/store";
import { Alert, Button, Card, Checkbox, Input, Select, Textarea } from "@/components/ui";
import { ImageUploader } from "@/components/ui/client";
import type { ProductVariant, products } from "@/db/schema";

type P = typeof products.$inferSelect;
export function ProductForm({ product, categories, currency }: { product?: P; categories: { id: number; name: string }[]; currency: string }) {
  const [state, action, pending] = useActionState(saveProductAction, undefined);
  const [options, setOptions] = useState<{ name: string; values: string[] }[]>(product?.options ?? []);
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? []);
  function generateVariants() {
    const valid = options.filter((o) => o.name && o.values.length);
    if (!valid.length) return setVariants([]);
    let combos: Record<string, string>[] = [{}];
    for (const o of valid) combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
    setVariants(combos.map((c) => { const name = Object.values(c).join(" / "); const ex = variants.find((v) => v.name === name); return ex ?? { id: Math.random().toString(36).slice(2, 8), name, options: c, stock: 0 }; }));
  }
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Alert state={state} />
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="options" value={JSON.stringify(options)} />
        <input type="hidden" name="variants" value={JSON.stringify(variants)} />
        <Card title="المعلومات الأساسية">
          <div className="space-y-4">
            <Input label="اسم المنتج" name="name" defaultValue={product?.name} required />
            <Input label="وصف مختصر" name="shortDescription" defaultValue={product?.shortDescription} />
            <Textarea label="الوصف المفصل" name="description" defaultValue={product?.description} rows={6} />
            <div className="grid gap-4 sm:grid-cols-2"><Input label="العلامة التجارية" name="brand" defaultValue={product?.brand} /><Select label="التصنيف" name="categoryId" defaultValue={product?.categoryId ?? ""} options={[{ value: "", label: "بدون تصنيف" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} /></div>
          </div>
        </Card>
        <Card title="الوسائط">
          <ImageUploader name="images" label="صور المنتج (عدة صور)" defaultValue={product?.images} multiple />
          <div className="mt-4"><Input label="رابط فيديو (YouTube أو mp4)" name="video" defaultValue={product?.video} /></div>
        </Card>
        <Card title="التسعير والمخزون">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label={`السعر (${currency})`} name="price" type="number" step="0.01" defaultValue={product?.price} required />
            <Input label="السعر قبل الخصم" name="comparePrice" type="number" step="0.01" defaultValue={product?.comparePrice} />
            <Input label="SKU" name="sku" defaultValue={product?.sku} />
            <Input label="الكمية / المخزون" name="stock" type="number" defaultValue={product?.stock ?? 0} />
            <Input label="الوزن (كجم)" name="weight" type="number" step="0.01" defaultValue={product?.weight} />
          </div>
        </Card>
        <Card title="الخيارات والمتغيرات (مقاس، لون...)">
          <div className="space-y-3">
            {options.map((o, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-5">
                <input value={o.name} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="اسم الخيار (اللون)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input defaultValue={o.values.join(", ")} onBlur={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) } : x)))} placeholder="القيم مفصولة بفاصلة: أحمر, أزرق" className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
                <Button variant="ghost" size="sm" onClick={() => setOptions(options.filter((_, j) => j !== i))}>حذف</Button>
              </div>
            ))}
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setOptions([...options, { name: "", values: [] }])}>+ خيار</Button><Button variant="secondary" size="sm" onClick={generateVariants}>توليد المتغيرات</Button></div>
            {variants.length > 0 && (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs"><tr><th className="p-2 text-start">المتغير</th><th className="p-2">السعر (اختياري)</th><th className="p-2">المخزون</th><th className="p-2">SKU</th><th className="p-2">رابط صورة</th></tr></thead><tbody>
                {variants.map((v, i) => (
                  <tr key={v.id} className="border-t"><td className="p-2 font-semibold">{v.name}</td>
                    <td className="p-2"><input type="number" step="0.01" value={v.price ?? ""} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="w-24 rounded-lg border px-2 py-1" /></td>
                    <td className="p-2"><input type="number" value={v.stock} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))} className="w-20 rounded-lg border px-2 py-1" /></td>
                    <td className="p-2"><input value={v.sku ?? ""} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} className="w-24 rounded-lg border px-2 py-1" /></td>
                    <td className="p-2"><input value={v.image ?? ""} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)))} className="w-32 rounded-lg border px-2 py-1" /></td></tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </Card>
        <Card title="تحسين محركات البحث (SEO)">
          <div className="space-y-4"><Input label="عنوان SEO" name="seoTitle" defaultValue={product?.seoTitle} /><Textarea label="وصف SEO" name="seoDescription" defaultValue={product?.seoDescription} rows={2} /><Input label="الرابط (slug)" name="slug" defaultValue={product?.slug} hint="يُولّد تلقائياً إن تُرك فارغاً" /></div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="النشر">
          <div className="space-y-3">
            <Select label="حالة النشر" name="status" defaultValue={product?.status ?? "published"} options={[{ value: "published", label: "منشور" }, { value: "draft", label: "مسودة" }, { value: "archived", label: "مؤرشف" }]} />
            <Checkbox label="منتج مميز" name="isFeatured" defaultChecked={product?.isFeatured} /><br />
            <Checkbox label="الأكثر مبيعاً" name="isBestSeller" defaultChecked={product?.isBestSeller} />
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ المنتج"}</Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
