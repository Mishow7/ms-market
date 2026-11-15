import type { ReactNode } from "react";
import { getStoreContext, listMyStores } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { switchStoreAction } from "@/actions/auth";
import { STORE_STATUSES } from "@/lib/utils";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const ctx = await getStoreContext();
  if (!ctx) redirect("/login?error=no_store");
  const { user, store, permissions, role } = ctx;
  const [{ c }] = await db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
  const myStores = role === "super_admin" ? [] : await listMyStores(user.id);
  const nav: NavItem[] = [{ href: "/dashboard", label: "نظرة عامة", icon: "📊" }];
  if (permissions.products) nav.push({ href: "/dashboard/products", label: "المنتجات", icon: "📦" }, { href: "/dashboard/categories", label: "التصنيفات", icon: "🗂️" });
  if (permissions.orders) nav.push({ href: "/dashboard/orders", label: "الطلبات", icon: "🧾" });
  if (permissions.customers) nav.push({ href: "/dashboard/customers", label: "العملاء", icon: "👥" });
  if (permissions.finance) nav.push({ href: "/dashboard/payments", label: "التحقق من المدفوعات", icon: "✅" }, { href: "/dashboard/finance", label: "الحسابات ووسائل الدفع", icon: "🏦" }, { href: "/dashboard/reports", label: "التقارير والمستحقات", icon: "📈" });
  if (permissions.marketing) nav.push({ href: "/dashboard/campaigns", label: "الحملات الإعلانية", icon: "📣" }, { href: "/dashboard/coupons", label: "الكوبونات", icon: "🎟️" });
  if (permissions.design) nav.push({ href: "/dashboard/themes", label: "القوالب والتصميم", icon: "🎨" }, { href: "/dashboard/builder", label: "منشئ الصفحات", icon: "🧩" });
  if (permissions.settings) nav.push({ href: "/dashboard/shipping", label: "الشحن والتوصيل", icon: "🚚" }, { href: "/dashboard/domains", label: "الدومينات", icon: "🌐" }, { href: "/dashboard/staff", label: "الموظفون", icon: "🧑‍💼" }, { href: "/dashboard/settings", label: "إعدادات المتجر", icon: "⚙️" });
  nav.push({ href: "/dashboard/notifications", label: "الإشعارات", icon: "🔔" }, { href: `/s/${store.slug}`, label: "زيارة المتجر", icon: "🛍️" });
  const st = STORE_STATUSES[store.status];
  return (
    <DashboardShell nav={nav} title={store.name} subtitle={role === "owner" ? "مدير المتجر" : role === "staff" ? "موظف" : "مالك المنصة"} userName={user.name} unread={c} notificationsHref="/dashboard/notifications"
      extra={myStores.length > 1 ? (
        <form action={async (fd) => { "use server"; await switchStoreAction(Number(fd.get("storeId"))); }} className="flex gap-1">
          <select name="storeId" defaultValue={store.id} className="w-full rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white">{myStores.map((s) => <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>)}</select>
          <button className="rounded-lg bg-teal-600 px-2 text-xs">تبديل</button>
        </form>
      ) : undefined}>
      {store.status !== "active" && <div className={`mb-6 rounded-2xl border p-4 text-sm ${st.color}`}><b>حالة المتجر: {st.label}.</b> {store.status === "pending" ? "متجرك قيد المراجعة من إدارة المنصة. يمكنك تجهيز المنتجات والإعدادات، وستُفعّل الواجهة بعد الموافقة." : store.status === "rejected" ? `تم رفض الطلب. ${store.rejectionReason ?? ""}` : "واجهة المتجر غير متاحة للزوار حالياً. تواصل مع إدارة المنصة."}</div>}
      {children}
    </DashboardShell>
  );
}
