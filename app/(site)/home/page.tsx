import Link from "next/link";
import { db } from "@/db";
import { plans, storeCategories, stores, products, orders } from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { StoreCard } from "@/components/site/StoreCard";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, latest, cats, planRows, [sc], [pc], [oc]] = await Promise.all([
    db.select().from(stores).where(and(eq(stores.status, "active"), eq(stores.isFeatured, true))).limit(6),
    db.select().from(stores).where(eq(stores.status, "active")).orderBy(desc(stores.createdAt)).limit(8),
    db.select().from(storeCategories),
    db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder).limit(4),
    db.select({ c: count() }).from(stores).where(eq(stores.status, "active")),
    db.select({ c: count() }).from(products).where(eq(products.status, "published")),
    db.select({ c: count() }).from(orders),
  ]);
  const features = [
    ["🌐", "دومين مستقل لكل متجر", "رابط فرعي مجاني أو دومين خاص مع تحقق DNS وشهادة SSL."],
    ["💳", "طرق دفع يمنية", "تحويل بنكي، محافظ إلكترونية، الدفع عند الاستلام، مع تحقق يدوي وآلي."],
    ["🎨", "قوالب ومنشئ صفحات مرئي", "اختر قالباً وخصّص صفحتك بالسحب والإفلات دون برمجة."],
    ["📣", "تسويق وتحليلات", "حملات إعلانية، كوبونات، تتبع نقرات وتحويلات وROAS."],
    ["🔒", "عزل كامل للبيانات", "كل متجر ببياناته وعملائه وحساباته المالية المستقلة."],
    ["📊", "تقارير احترافية", "لوحات تحكم بمؤشرات حية للمبيعات والأرباح والمستحقات."],
  ];
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-900 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #14b8a6 0, transparent 40%), radial-gradient(circle at 80% 60%, #f59e0b 0, transparent 35%)" }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-24 md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-xs font-bold text-teal-200">منصة SaaS متعددة المتاجر • اليمن</span>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">أطلق متجرك الإلكتروني <span className="text-amber-400">خلال دقائق</span></h1>
            <p className="mt-5 max-w-lg text-lg text-slate-300">MS Commerce تمنحك متجراً مستقلاً بدومينك الخاص، تصميمك الخاص، وحساباتك البنكية ومحافظك اليمنية، مع أدوات تسويق وتحليلات حقيقية.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-2xl bg-amber-500 px-7 py-3.5 font-bold text-slate-900 shadow-lg shadow-amber-500/30 hover:bg-amber-400">أنشئ متجرك مجاناً</Link>
              <Link href="/stores" className="rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 font-bold backdrop-blur hover:bg-white/20">استكشف المتاجر</Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 text-center">
              {[[sc.c, "متجر نشط"], [pc.c, "منتج"], [oc.c, "طلب"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black">{v}</p><p className="text-xs text-slate-300">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between"><p className="font-bold">لوحة التاجر</p><span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">مباشر</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[["إجمالي المبيعات", money(1250000)], ["الطلبات", "348"], ["العملاء", "212"], ["صافي المستحق", money(1187500)]].map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-300">{l}</p><p className="mt-1 text-lg font-black">{v}</p></div>
                ))}
              </div>
              <div className="mt-4 flex h-28 items-end gap-1.5">
                {[40, 65, 50, 80, 60, 95, 70, 85, 55, 90, 75, 100].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-teal-500 to-amber-400" style={{ height: `${h}%` }} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-center text-3xl font-black">كل ما تحتاجه لتجارة إلكترونية ناجحة</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(([i, t, d]) => (
            <div key={t} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="text-3xl">{i}</div><h3 className="mt-3 text-lg font-bold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>
          ))}
        </div>
      </section>

      {cats.length > 0 && (
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-2xl font-black">تصفح حسب تصنيف المتجر</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {cats.map((c) => <Link key={c.id} href={`/stores?category=${c.id}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold hover:border-teal-500 hover:text-teal-700">{c.icon} {c.name}</Link>)}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-black">⭐ المتاجر المميزة</h2><Link href="/stores" className="text-sm font-bold text-teal-700">عرض الكل</Link></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((s) => <StoreCard key={s.id} store={s} />)}</div>
        </section>
      )}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-black">🆕 أحدث المتاجر</h2><Link href="/stores" className="text-sm font-bold text-teal-700">عرض الكل</Link></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{latest.map((s) => <StoreCard key={s.id} store={s} compact />)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-center text-3xl font-black">باقات تناسب كل تاجر</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {planRows.map((p, i) => (
            <div key={p.id} className={`rounded-3xl border p-6 ${i === 2 ? "border-teal-500 bg-teal-600 text-white shadow-xl" : "border-slate-200 bg-white"}`}>
              <p className="font-bold">{p.name}</p>
              <p className="mt-3 text-3xl font-black">{Number(p.priceMonthly) === 0 ? "مجاناً" : money(p.priceMonthly, p.currency)}<span className="text-sm font-normal opacity-70">/شهر</span></p>
              <ul className={`mt-4 space-y-2 text-sm ${i === 2 ? "text-teal-50" : "text-slate-600"}`}>
                <li>✓ حتى {p.maxProducts} منتج</li><li>✓ {p.maxStaff} موظف</li><li>{p.allowCustomDomain ? "✓" : "✗"} دومين خاص</li><li>{p.allowMarketing ? "✓" : "✗"} أدوات التسويق</li><li>✓ عمولة {p.commissionPercent}%</li>
              </ul>
              <Link href={`/register?plan=${p.id}`} className={`mt-6 block rounded-xl py-2.5 text-center font-bold ${i === 2 ? "bg-white text-teal-700" : "bg-slate-900 text-white"}`}>ابدأ الآن</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
