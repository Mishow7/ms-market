import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function Notifications() {
  const { user } = await requireStore();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.id)).limit(100);
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  const ICON: Record<string, string> = { new_order: "🧾", payment_review: "💳", payment_confirmed: "✅", low_stock: "📉", domain_verified: "🌐", domain_active: "🔒", store_status: "🏬", account_verification: "🏦", staff_added: "🧑‍💼" };
  return (
    <div>
      <PageHeader title="مركز الإشعارات" />
      {rows.length === 0 ? <EmptyState icon="🔔" title="لا توجد إشعارات" /> : <ul className="space-y-2">{rows.map((n) => <li key={n.id} className={`rounded-2xl border bg-white p-4 ${n.isRead ? "border-slate-200" : "border-teal-300 bg-teal-50/40"}`}><div className="flex items-start gap-3"><span className="text-2xl">{ICON[n.type] ?? "🔔"}</span><div className="flex-1"><p className="font-bold">{n.title}</p>{n.body && <p className="text-sm text-slate-600">{n.body}</p>}<p className="mt-1 text-xs text-slate-400">{fmtDateTime(n.createdAt)}</p></div>{n.link && <Link href={n.link} className="text-sm font-bold text-teal-700">فتح</Link>}</div></li>)}</ul>}
    </div>
  );
}
