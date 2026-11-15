import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const rows = await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder);
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <h1 className="text-center text-4xl font-black">الباقات والأسعار</h1>
      <p className="mt-3 text-center text-slate-500">اختر الباقة المناسبة لحجم تجارتك. يمكنك الترقية أو التخفيض في أي وقت.</p>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {rows.map((p) => (
          <div key={p.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h3 className="text-xl font-black">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{p.description}</p>
            <p className="mt-5 text-3xl font-black text-teal-700">{Number(p.priceMonthly) === 0 ? "مجاناً" : money(p.priceMonthly, p.currency)}<span className="text-sm font-normal text-slate-400">/شهر</span></p>
            {Number(p.priceYearly) > 0 && <p className="text-xs text-slate-400">أو {money(p.priceYearly, p.currency)} سنوياً</p>}
            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
              <li>📦 حتى {p.maxProducts} منتج</li>
              <li>👥 {p.maxStaff} موظف</li>
              <li>🎨 {p.maxThemes} قالب</li>
              <li>💾 {p.storageMb} MB تخزين</li>
              <li>{p.allowCustomDomain ? "✅" : "❌"} ربط دومين خاص</li>
              <li>{p.allowMarketing ? "✅" : "❌"} الحملات الإعلانية والكوبونات</li>
              <li>{p.allowReports ? "✅" : "❌"} التقارير المتقدمة</li>
              <li>💰 عمولة المنصة {p.commissionPercent}%</li>
              <li>⏱ مدة الاشتراك {p.durationDays} يوم</li>
            </ul>
            <Link href={`/register?plan=${p.id}`} className="mt-6 rounded-xl bg-teal-600 py-3 text-center font-bold text-white hover:bg-teal-700">اشترك الآن</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
