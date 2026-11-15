import { db } from "@/db";
import { adEvents, campaigns, categories, orders, products } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { deleteCampaignAction, saveCampaignAction, setCampaignStatusAction } from "@/actions/store";
import { ActionForm, ConfirmButton, ImageUploader, Modal } from "@/components/ui/client";
import { Badge, Button, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { money } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";
const PLACEMENTS: Record<string, string> = { home_top: "أعلى الصفحة الرئيسية", home_middle: "وسط الصفحة الرئيسية", sidebar: "الشريط الجانبي", popup: "نافذة منبثقة", product_page: "صفحة المنتج" };

export default async function Campaigns() {
  const { store } = await requireStore("marketing");
  const [rows, prods, cats] = await Promise.all([
    db.select({
      c: campaigns,
      views: sql<number>`(select count(*) from ${adEvents} where ${adEvents.campaignId}=${campaigns.id} and ${adEvents.type}='view' and not ${adEvents.isBot})`,
      uniq: sql<number>`(select count(distinct ${adEvents.visitorId}) from ${adEvents} where ${adEvents.campaignId}=${campaigns.id} and ${adEvents.type}='view' and not ${adEvents.isBot})`,
      clicks: sql<number>`(select count(*) from ${adEvents} where ${adEvents.campaignId}=${campaigns.id} and ${adEvents.type}='click' and not ${adEvents.isBot})`,
      ordersN: sql<number>`(select count(*) from ${orders} where ${orders.campaignId}=${campaigns.id} and ${orders.status} not in ('cancelled','returned'))`,
      revenue: sql<string>`coalesce((select sum(${orders.total}) from ${orders} where ${orders.campaignId}=${campaigns.id} and ${orders.paymentStatus}='paid'),0)`,
    }).from(campaigns).where(eq(campaigns.storeId, store.id)).orderBy(desc(campaigns.id)),
    db.select({ id: products.id, name: products.name }).from(products).where(and(eq(products.storeId, store.id))),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.storeId, store.id)),
  ]);
  const Form = ({ c }: { c?: typeof campaigns.$inferSelect }) => (
    <ActionForm action={saveCampaignAction} resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <Input label="عنوان الإعلان" name="title" defaultValue={c?.title} required />
      <Textarea label="وصف الإعلان" name="description" defaultValue={c?.description} rows={2} />
      <ImageUploader name="image" label="صورة الإعلان / البنر" defaultValue={c?.image} />
      <div className="grid gap-3 sm:grid-cols-2"><Input label="رابط فيديو" name="video" defaultValue={c?.video} /><Input label="رابط الإعلان" name="link" defaultValue={c?.link} placeholder="/s/slug/products أو رابط خارجي" /><Select label="مكان العرض" name="placement" defaultValue={c?.placement} options={Object.entries(PLACEMENTS).map(([k, v]) => ({ value: k, label: v }))} /><Input label="تكلفة الإعلان" name="cost" type="number" step="0.01" defaultValue={c?.cost} /><Select label="ربط بمنتج" name="productId" defaultValue={c?.productId ?? ""} options={[{ value: "", label: "بدون" }, ...prods.map((p) => ({ value: p.id, label: p.name }))]} /><Select label="ربط بتصنيف" name="categoryId" defaultValue={c?.categoryId ?? ""} options={[{ value: "", label: "بدون" }, ...cats.map((p) => ({ value: p.id, label: p.name }))]} /><Input label="تاريخ البداية" name="startsAt" type="date" defaultValue={c?.startsAt?.toISOString().slice(0, 10)} /><Input label="تاريخ النهاية" name="endsAt" type="date" defaultValue={c?.endsAt?.toISOString().slice(0, 10)} /><Select label="الحالة" name="status" defaultValue={c?.status} options={[{ value: "active", label: "نشطة" }, { value: "paused", label: "متوقفة" }, { value: "ended", label: "منتهية" }]} /></div>
    </ActionForm>
  );
  return (
    <div>
      <PageHeader title="الحملات الإعلانية" description="إعلانات وبنرات متجرك مع تتبع حقيقي للمشاهدات والنقرات والطلبات الناتجة" action={<Modal title="حملة جديدة" trigger={<Button>+ حملة إعلانية</Button>}><Form /></Modal>} />
      <Table headers={["الحملة", "المكان", "المشاهدات (فريدة)", "النقرات", "CTR", "الطلبات", "التحويل", "المبيعات", "ROAS", "الحالة", ""]}>
        {rows.map(({ c, views, uniq, clicks, ordersN, revenue }) => {
          const ctr = views ? ((clicks / views) * 100).toFixed(1) : "0";
          const conv = clicks ? ((ordersN / clicks) * 100).toFixed(1) : "0";
          const roas = Number(c.cost) > 0 ? (Number(revenue) / Number(c.cost)).toFixed(2) : "—";
          return (
            <tr key={c.id}><td className="px-4 py-3"><Link href={`/dashboard/campaigns/${c.id}`} className="font-bold hover:text-teal-700">{c.title}</Link></td><td className="px-4 py-3 text-xs">{PLACEMENTS[c.placement]}</td><td className="px-4 py-3">{views} ({uniq})</td><td className="px-4 py-3">{clicks}</td><td className="px-4 py-3">{ctr}%</td><td className="px-4 py-3">{ordersN}</td><td className="px-4 py-3">{conv}%</td><td className="px-4 py-3">{money(revenue, store.currency)}</td><td className="px-4 py-3">{roas}</td>
              <td className="px-4 py-3"><Badge className={c.status === "active" ? "bg-emerald-100 text-emerald-700" : c.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-slate-200"}>{c.status === "active" ? "نشطة" : c.status === "paused" ? "متوقفة" : "منتهية"}</Badge></td>
              <td className="px-4 py-3"><div className="flex gap-1"><Modal title="تعديل الحملة" trigger={<Button size="sm" variant="outline">تعديل</Button>}><Form c={c} /></Modal>{c.status === "active" ? <ConfirmButton variant="outline" message="إيقاف الحملة؟" onConfirm={async () => { "use server"; await setCampaignStatusAction(c.id, "paused"); }}>إيقاف</ConfirmButton> : <ConfirmButton variant="primary" message="تشغيل الحملة؟" onConfirm={async () => { "use server"; await setCampaignStatusAction(c.id, "active"); }}>تشغيل</ConfirmButton>}<ConfirmButton onConfirm={async () => { "use server"; await deleteCampaignAction(c.id); }}>حذف</ConfirmButton></div></td></tr>
          );
        })}
        {rows.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">لا توجد حملات بعد</td></tr>}
      </Table>
    </div>
  );
}
