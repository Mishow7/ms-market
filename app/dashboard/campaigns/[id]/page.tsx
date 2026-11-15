import { db } from "@/db";
import { adEvents, campaigns, orders } from "@/db/schema";
import { and, eq, sql, gte } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { notFound } from "next/navigation";
import { BarChart, Card, PageHeader, StatCard } from "@/components/ui";
import { money } from "@/lib/utils";
import { ExportCsvButton } from "@/components/dashboard/ExportCsv";
export const dynamic = "force-dynamic";

export default async function CampaignAnalytics({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const { store } = await requireStore("marketing");
  const id = Number((await params).id);
  const { range = "daily" } = await searchParams;
  const [c] = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.storeId, store.id)));
  if (!c) notFound();
  const fmt = range === "monthly" ? "YYYY-MM" : range === "weekly" ? "IYYY-IW" : "MM-DD";
  const since = new Date(Date.now() - (range === "monthly" ? 365 : range === "weekly" ? 90 : 30) * 86400_000);
  const [series, [tot], [ord]] = await Promise.all([
    db.select({ d: sql<string>`to_char(${adEvents.createdAt}, '${sql.raw(fmt)}')`, views: sql<number>`count(*) filter (where ${adEvents.type}='view')`, clicks: sql<number>`count(*) filter (where ${adEvents.type}='click')` }).from(adEvents).where(and(eq(adEvents.campaignId, id), eq(adEvents.isBot, false), gte(adEvents.createdAt, since))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ views: sql<number>`count(*) filter (where ${adEvents.type}='view')`, uniq: sql<number>`count(distinct ${adEvents.visitorId}) filter (where ${adEvents.type}='view')`, clicks: sql<number>`count(*) filter (where ${adEvents.type}='click')`, bots: sql<number>`count(*) filter (where ${adEvents.isBot})` }).from(adEvents).where(and(eq(adEvents.campaignId, id), eq(adEvents.isBot, false))),
    db.select({ n: sql<number>`count(*) filter (where ${orders.status} not in ('cancelled','returned'))`, rev: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus}='paid'),0)` }).from(orders).where(eq(orders.campaignId, id)),
  ]);
  const ctr = tot.views ? (tot.clicks / tot.views) * 100 : 0;
  const conv = tot.clicks ? (ord.n / tot.clicks) * 100 : 0;
  const roas = Number(c.cost) > 0 ? Number(ord.rev) / Number(c.cost) : null;
  const csv = [["الفترة", "المشاهدات", "النقرات"], ...series.map((s) => [s.d, String(s.views), String(s.clicks)])];
  return (
    <div className="space-y-6">
      <PageHeader title={`تحليلات: ${c.title}`} description="بيانات حقيقية من نظام التتبع (مع استبعاد الزيارات الآلية والتكرار)" action={<><a href={`?range=daily`} className={`rounded-xl px-3 py-2 text-sm ${range === "daily" ? "bg-teal-600 text-white" : "bg-white border"}`}>يومي</a><a href={`?range=weekly`} className={`rounded-xl px-3 py-2 text-sm ${range === "weekly" ? "bg-teal-600 text-white" : "bg-white border"}`}>أسبوعي</a><a href={`?range=monthly`} className={`rounded-xl px-3 py-2 text-sm ${range === "monthly" ? "bg-teal-600 text-white" : "bg-white border"}`}>شهري</a><ExportCsvButton rows={csv} filename={`campaign-${id}.csv`} /></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المشاهدات" value={tot.views} hint={`${tot.uniq} فريدة`} icon="👁" /><StatCard label="النقرات" value={tot.clicks} hint={`CTR ${ctr.toFixed(2)}%`} icon="👆" tone="indigo" /><StatCard label="الطلبات الناتجة" value={ord.n} hint={`معدل التحويل ${conv.toFixed(2)}%`} icon="🧾" tone="amber" /><StatCard label="المبيعات الناتجة" value={money(ord.rev, store.currency)} hint={`التكلفة ${money(c.cost, store.currency)} • ROAS ${roas != null ? roas.toFixed(2) : "غير متاح"}`} icon="💵" tone="emerald" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2"><Card title="المشاهدات"><BarChart data={series.map((s) => ({ label: s.d, value: Number(s.views) }))} /></Card><Card title="النقرات"><BarChart data={series.map((s) => ({ label: s.d, value: Number(s.clicks) }))} color="#f59e0b" /></Card></div>
    </div>
  );
}
