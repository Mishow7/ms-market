import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function N() {
  const user = await requireUser();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.id)).limit(100);
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  return <div><PageHeader title="الإشعارات" />{rows.length === 0 ? <EmptyState icon="🔔" title="لا توجد إشعارات" /> : <ul className="space-y-2">{rows.map((n) => <li key={n.id} className="rounded-2xl border bg-white p-4"><p className="font-bold">{n.title}</p>{n.body && <p className="text-sm text-slate-600">{n.body}</p>}<div className="mt-1 flex justify-between text-xs text-slate-400"><span>{fmtDateTime(n.createdAt)}</span>{n.link && <Link href={n.link} className="text-teal-700">فتح</Link>}</div></li>)}</ul>}</div>;
}
