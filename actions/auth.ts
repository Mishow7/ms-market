"use server";

import { db } from "@/db";
import { contactMessages, domains, plans, storeMembers, stores, subscriptions, users } from "@/db/schema";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { audit, notifyUser } from "@/lib/notify";
import { platformHost, randomToken, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type ActionState = { error?: string; success?: string } | undefined;

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const next = str(fd, "next");
  if (!email || !password) return { error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" };
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u || !verifyPassword(password, u.passwordHash)) return { error: "بيانات الدخول غير صحيحة" };
  if (!u.isActive) return { error: "هذا الحساب معطل. تواصل مع إدارة المنصة." };
  await createSession(u.id);
  await audit({ userId: u.id, action: "login", entity: "user", entityId: u.id });
  if (next && next.startsWith("/")) redirect(next);
  if (u.role === "super_admin") redirect("/admin");
  if (u.role === "merchant" || u.role === "staff") redirect("/dashboard");
  redirect("/account");
}

export async function registerCustomerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const phone = str(fd, "phone");
  const password = str(fd, "password");
  const next = str(fd, "next");
  if (!name || !email || password.length < 6) return { error: "يرجى تعبئة البيانات، وكلمة المرور 6 أحرف على الأقل" };
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists.length) return { error: "البريد الإلكتروني مسجل مسبقاً" };
  const [u] = await db.insert(users).values({ name, email, phone, passwordHash: hashPassword(password), role: "customer" }).returning();
  await createSession(u.id);
  redirect(next && next.startsWith("/") ? next : "/account");
}

export async function registerMerchantAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const phone = str(fd, "phone");
  const password = str(fd, "password");
  const storeName = str(fd, "storeName");
  const slugRaw = str(fd, "slug") || storeName;
  const city = str(fd, "city");
  const planId = Number(fd.get("planId") || 0);
  const categoryId = Number(fd.get("categoryId") || 0) || null;
  const description = str(fd, "description");
  if (!name || !email || password.length < 6 || !storeName) return { error: "يرجى تعبئة جميع الحقول المطلوبة (كلمة المرور 6 أحرف على الأقل)" };
  const slug = slugify(slugRaw).replace(/[^a-z0-9-]/g, "") || `store-${randomToken(5)}`;
  if (slug.length < 3) return { error: "رابط المتجر يجب أن يكون 3 أحرف إنجليزية على الأقل" };

  const current = await getCurrentUser();
  let userId: number;
  if (current) {
    userId = current.id;
    if (current.role === "customer") await db.update(users).set({ role: "merchant" }).where(eq(users.id, userId));
  } else {
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists.length) return { error: "البريد الإلكتروني مسجل مسبقاً، سجّل الدخول أولاً ثم أنشئ متجرك" };
    const [u] = await db.insert(users).values({ name, email, phone, passwordHash: hashPassword(password), role: "merchant" }).returning();
    userId = u.id;
  }
  const slugTaken = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1);
  if (slugTaken.length) return { error: "رابط المتجر مستخدم، اختر رابطاً آخر" };

  const { platformSettings } = await import("@/db/schema");
  const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, "auto_approve_stores")).limit(1);
  const autoApprove = setting?.value === "true";

  const [plan] = planId ? await db.select().from(plans).where(eq(plans.id, planId)).limit(1) : await db.select().from(plans).where(eq(plans.slug, "free")).limit(1);

  const [store] = await db
    .insert(stores)
    .values({ name: storeName, slug, ownerId: userId, ownerName: name, email, phone, city, description, categoryId, status: autoApprove ? "active" : "pending" })
    .returning();
  await db.insert(storeMembers).values({ storeId: store.id, userId, role: "owner" });
  if (plan) {
    await db.insert(subscriptions).values({
      storeId: store.id,
      planId: plan.id,
      status: Number(plan.priceMonthly) > 0 ? "pending_payment" : "active",
      amount: plan.priceMonthly,
      endsAt: new Date(Date.now() + plan.durationDays * 86400_000),
    });
  }
  const base = platformHost().split(":")[0];
  await db.insert(domains).values({ storeId: store.id, hostname: `${slug}.${base}`, type: "subdomain", isPrimary: true, status: "active", sslStatus: "issued", verificationToken: randomToken(16) });

  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "super_admin"));
  for (const a of admins) await notifyUser(a.id, { type: "store_request", title: "طلب إنشاء متجر جديد", body: `${storeName} بواسطة ${name}`, link: `/admin/stores/${store.id}` });
  await audit({ userId, storeId: store.id, action: "store.requested", entity: "store", entityId: store.id });

  if (!current) await createSession(userId);
  const c = await cookies();
  c.set("ms_store", String(store.id), { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function switchStoreAction(storeId: number) {
  const c = await cookies();
  c.set("ms_store", String(storeId), { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/dashboard");
}

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const name = str(fd, "name");
  const email = str(fd, "email");
  const message = str(fd, "message");
  if (!name || !email || !message) return { error: "يرجى تعبئة جميع الحقول" };
  await db.insert(contactMessages).values({ name, email, subject: str(fd, "subject"), message });
  return { success: "تم استلام رسالتك، سنتواصل معك قريباً." };
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getCurrentUser();
  if (!u) return { error: "غير مصرح" };
  const name = str(fd, "name");
  const phone = str(fd, "phone");
  const password = str(fd, "password");
  const locale = str(fd, "locale") || "ar";
  const patch: Partial<typeof users.$inferInsert> = { name: name || u.name, phone, locale };
  if (password) {
    if (password.length < 6) return { error: "كلمة المرور قصيرة" };
    patch.passwordHash = hashPassword(password);
  }
  await db.update(users).set(patch).where(eq(users.id, u.id));
  return { success: "تم حفظ البيانات" };
}
