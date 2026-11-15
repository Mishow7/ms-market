import { db } from "@/db";
import { auditLogs, financeLogs, notifications, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Table, Badge } from "@/components/ui";
import { Tabs } from "@/components/ui/client";
import { fmtDateTime, money } from "@/lib/utils";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Audit() {
  const admin = await requireSuperAdmin();
  const [logs, fin, notes] = await Promise.all([
    db.select({ l: auditLogs, user: users.name }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).orderBy(desc(auditLogs.id)).limit(200),
    db.select({ l: financeLogs, user: users.name }).from(financeLogs).leftJoin(users, eq(users.id, financeLogs.userId)).orderBy(desc(financeLogs.id)).limit(200),
    db.select().from(notifications).where(eq(notifications.userId, admin.id)).orderBy(desc(notifications.id)).limit(50),
  ]);
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, admin.id));
  return (
    <div>
      <PageHeader title="سجل التدقيق والإشعارات" description="تسجيل عمليات المستخدمين وجميع التغييرات المالية" />
      <Tabs tabs={[
        { label: "إشعارات المنصة", content: <ul className="space-y-2">{notes.map((n) => <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-bold">{n.title}</p><p className="text-sm text-slate-500">{n.body}</p><p className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</p></li>)}{notes.length === 0 && <p className="py-10 text-center text-slate-400">لا توجد إشعارات</p>}</ul> },
        { label: "سجل العمليات", content: <Table headers={["الوقت", "المستخدم", "الإجراء", "الكيان", "المتجر"]}>{logs.map(({ l, user }) => <tr key={l.id}><td className="px-4 py-2 text-xs text-slate-400">{fmtDateTime(l.createdAt)}</td><td className="px-4 py-2">{user ?? "-"}</td><td className="px-4 py-2 font-mono text-xs">{l.action}</td><td className="px-4 py-2">{l.entity} #{l.entityId}</td><td className="px-4 py-2">{l.storeId ?? "-"}</td></tr>)}</Table> },
        { label: "السجل المالي", content: <Table headers={["الوقت", "المستخدم", "الإجراء", "الكيان", "المبلغ", "المتجر"]}>{fin.map(({ l, user }) => <tr key={l.id}><td className="px-4 py-2 text-xs text-slate-400">{fmtDateTime(l.createdAt)}</td><td className="px-4 py-2">{user ?? "نظام"}</td><td className="px-4 py-2"><Badge>{l.action}</Badge></td><td className="px-4 py-2">{l.entity} #{l.entityId}</td><td className="px-4 py-2">{l.amount ? money(l.amount) : "-"}</td><td className="px-4 py-2">{l.storeId ?? "-"}</td></tr>)}</Table> },
      ]} />
    </div>
  );
}
