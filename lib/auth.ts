import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, storeMembers, stores, users, type StaffPermissions } from "@/db/schema";

export const SESSION_COOKIE = "ms_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = scryptSync(password, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return orig.length === check.length && timingSafeEqual(orig, check);
}

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const h = await headers();
  await db.insert(sessions).values({ id, userId, expiresAt, userAgent: h.get("user-agent")?.slice(0, 200) });
  const c = await cookies();
  c.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

export async function destroySession() {
  const c = await cookies();
  const id = c.get(SESSION_COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  c.delete(SESSION_COOKIE);
}

export type SessionUser = { id: number; name: string; email: string; role: string; phone: string | null; locale: string };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const id = c.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, phone: users.phone, locale: users.locale, isActive: users.isActive, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  const r = rows[0];
  if (!r || !r.isActive || r.expiresAt < new Date()) return null;
  return { id: r.id, name: r.name, email: r.email, role: r.role, phone: r.phone, locale: r.locale };
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireSuperAdmin() {
  const u = await requireUser();
  if (u.role !== "super_admin") redirect("/login?error=forbidden");
  return u;
}

export type StoreContext = {
  user: SessionUser;
  store: typeof stores.$inferSelect;
  role: "owner" | "staff" | "super_admin";
  permissions: StaffPermissions;
};

const FULL: StaffPermissions = { products: true, orders: true, customers: true, marketing: true, finance: true, design: true, settings: true };

/** Resolves the store for the current merchant/staff. Enforced server-side: data isolation by store_id. */
export async function getStoreContext(preferredStoreId?: number): Promise<StoreContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const c = await cookies();
  const cookieStore = Number(c.get("ms_store")?.value || 0);
  const wanted = preferredStoreId || cookieStore || 0;

  if (user.role === "super_admin") {
    const [s] = wanted ? await db.select().from(stores).where(eq(stores.id, wanted)).limit(1) : await db.select().from(stores).limit(1);
    if (!s) return null;
    return { user, store: s, role: "super_admin", permissions: FULL };
  }
  const memberships = await db
    .select({ store: stores, role: storeMembers.role, permissions: storeMembers.permissions })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(eq(storeMembers.userId, user.id));
  if (memberships.length === 0) return null;
  const m = memberships.find((x) => x.store.id === wanted) ?? memberships[0];
  return { user, store: m.store, role: m.role === "owner" ? "owner" : "staff", permissions: m.role === "owner" ? FULL : m.permissions };
}

export async function requireStore(permission?: keyof StaffPermissions) {
  const ctx = await getStoreContext();
  if (!ctx) redirect("/login?error=no_store");
  if (permission && !ctx.permissions[permission]) redirect("/dashboard?error=forbidden");
  return ctx;
}

export async function listMyStores(userId: number) {
  return db
    .select({ id: stores.id, name: stores.name, slug: stores.slug, status: stores.status, role: storeMembers.role })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(and(eq(storeMembers.userId, userId)));
}
