import "server-only";
import { db } from "@/db";
import { auditLogs, financeLogs, notifications, storeMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function notifyUser(userId: number, data: { type: string; title: string; body?: string; link?: string; storeId?: number }) {
  await db.insert(notifications).values({ userId, ...data });
}

export async function notifyStore(storeId: number, data: { type: string; title: string; body?: string; link?: string }) {
  const members = await db.select({ userId: storeMembers.userId }).from(storeMembers).where(eq(storeMembers.storeId, storeId));
  if (members.length === 0) return;
  await db.insert(notifications).values(members.map((m) => ({ userId: m.userId, storeId, ...data })));
}

export async function audit(params: { userId?: number | null; storeId?: number | null; action: string; entity: string; entityId?: string | number | null; meta?: Record<string, unknown> }) {
  await db.insert(auditLogs).values({
    userId: params.userId ?? null,
    storeId: params.storeId ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId != null ? String(params.entityId) : null,
    meta: params.meta ?? {},
  });
}

export async function financeLog(params: { userId?: number | null; storeId?: number | null; action: string; entity: string; entityId?: number | null; amount?: string | number | null; meta?: Record<string, unknown> }) {
  await db.insert(financeLogs).values({
    userId: params.userId ?? null,
    storeId: params.storeId ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    amount: params.amount != null ? String(params.amount) : null,
    meta: params.meta ?? {},
  });
}
