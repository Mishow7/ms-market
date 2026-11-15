import { db } from "@/db";
import { plans, storeCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MerchantRegisterForm } from "@/components/site/AuthForms";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const [planRows, cats, user] = await Promise.all([db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder), db.select().from(storeCategories), getCurrentUser()]);
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-black">أنشئ متجرك الآن</h1>
        <p className="mt-3 text-slate-500">خطوات بسيطة: سجّل بياناتك، اختر الباقة، وسيتم مراجعة طلبك وتفعيل متجرك.</p>
        <ul className="mt-6 space-y-3 text-sm text-slate-600">
          <li>✅ رابط فرعي مجاني فوراً</li><li>✅ ربط دومين خاص (حسب الباقة)</li><li>✅ حساباتك البنكية ومحافظك اليمنية</li><li>✅ قوالب جاهزة ومنشئ صفحات</li><li>✅ لوحة تحكم كاملة وتقارير</li>
        </ul>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl lg:col-span-3">
        <MerchantRegisterForm plans={planRows.map((p) => ({ id: p.id, name: p.name, price: Number(p.priceMonthly) === 0 ? "مجاناً" : money(p.priceMonthly, p.currency) + "/شهر" }))} categories={cats.map((c) => ({ id: c.id, name: `${c.icon} ${c.name}` }))} defaultPlan={plan ? Number(plan) : undefined} loggedIn={!!user} />
      </div>
    </div>
  );
}
