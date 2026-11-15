import type { ReactNode } from "react";
import { requireSuperAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";

const nav = [
  { href: "/admin", label: "نظرة عامة", icon: "📊" },
  { href: "/admin/stores", label: "المتاجر", icon: "🏬" },
  { href: "/admin/merchants", label: "التجار والمستخدمون", icon: "👥" },
  { href: "/admin/subscriptions", label: "الاشتراكات", icon: "🧾" },
  { href: "/admin/plans", label: "الباقات", icon: "📦" },
  { href: "/admin/commissions", label: "العمولات والأرباح", icon: "💰" },
  { href: "/admin/themes", label: "مكتبة القوالب", icon: "🎨" },
  { href: "/admin/domains", label: "الدومينات وSSL", icon: "🌐" },
  { href: "/admin/payments", label: "وسائل الدفع", icon: "💳" },
  { href: "/admin/audit", label: "سجل التدقيق", icon: "🛡️" },
  { href: "/admin/settings", label: "إعدادات المنصة", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin();
  const [{ c }] = await db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
  return (
    <DashboardShell nav={nav} title="MS Commerce" subtitle="لوحة مالك المنصة" userName={user.name} unread={c} notificationsHref="/admin/audit?tab=notifications">
      {children}
    </DashboardShell>
  );
}
