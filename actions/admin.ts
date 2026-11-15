"use server";

import { db } from "@/db";
import { commissions, domains, paymentProviders, plans, platformSettings, storeCategories, storeMembers, storePaymentAccounts, stores, subscriptions, themes, users, type ThemeConfig } from "@/db/schema";
import { hashPassword, requireSuperAdmin } from "@/lib/auth";
import { audit, financeLog, notifyStore, notifyUser } from "@/lib/notify";
import { platformHost, randomToken, slugify } from "@/lib/utils";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./auth";
import { verifyDomainDns } from "@/lib/domains";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string, d = 0) => (fd.get(k) === null || fd.get(k) === "" ? d : Number(fd.get(k)));
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

// ---------- Stores ----------
export async function adminCreateStoreAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const name = s(fd, "name");
  const slug = slugify(s(fd, "slug") || name).replace(/[^a-z0-9-]/g, "");
  const ownerEmail = s(fd, "ownerEmail").toLowerCase();
  const ownerName = s(fd, "ownerName");
  const ownerPassword = s(fd, "ownerPassword");
  const planId = num(fd, "planId");
  if (!name || !slug || !ownerEmail) return { error: "الاسم والرابط وبريد المالك مطلوبة" };
  const taken = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1);
  if (taken.length) return { error: "رابط المتجر مستخدم" };

  let [owner] = await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (!owner) {
    if (!ownerName || ownerPassword.length < 6) return { error: "المالك غير موجود؛ أدخل اسمه وكلمة مرور (6 أحرف+) لإنشاء حسابه" };
    [owner] = await db.insert(users).values({ name: ownerName, email: ownerEmail, passwordHash: hashPassword(ownerPassword), role: "merchant", phone: s(fd, "ownerPhone") }).returning();
  } else if (owner.role === "customer") {
    await db.update(users).set({ role: "merchant" }).where(eq(users.id, owner.id));
  }
  const [store] = await db
    .insert(stores)
    .values({ name, slug, ownerId: owner.id, ownerName: owner.name, email: ownerEmail, phone: s(fd, "phone"), city: s(fd, "city"), description: s(fd, "description"), categoryId: num(fd, "categoryId") || null, status: "active", currency: s(fd, "currency") || "YER" })
    .returning();
  await db.insert(storeMembers).values({ storeId: store.id, userId: owner.id, role: "owner" });
  const [plan] = planId ? await db.select().from(plans).where(eq(plans.id, planId)) : await db.select().from(plans).where(eq(plans.slug, "free"));
  if (plan) await db.insert(subscriptions).values({ storeId: store.id, planId: plan.id, status: "active", amount: plan.priceMonthly, endsAt: new Date(Date.now() + plan.durationDays * 86400_000) });
  await db.insert(domains).values({ storeId: store.id, hostname: `${slug}.${platformHost().split(":")[0]}`, type: "subdomain", isPrimary: true, status: "active", sslStatus: "issued", verificationToken: randomToken(16) });
  await notifyUser(owner.id, { type: "store_created", title: "تم إنشاء متجرك", body: `متجر ${name} جاهز الآن`, link: "/dashboard", storeId: store.id });
  await audit({ userId: admin.id, storeId: store.id, action: "store.create", entity: "store", entityId: store.id });
  redirect(`/admin/stores/${store.id}`);
}

export async function adminUpdateStoreStatusAction(storeId: number, status: string, reason?: string) {
  const admin = await requireSuperAdmin();
  if (!["pending", "active", "suspended", "rejected", "expired"].includes(status)) return;
  await db.update(stores).set({ status, rejectionReason: reason ?? null }).where(eq(stores.id, storeId));
  const labels: Record<string, string> = { active: "تم تفعيل متجرك", suspended: "تم تعليق متجرك", rejected: "تم رفض طلب المتجر", pending: "متجرك قيد المراجعة", expired: "انتهى اشتراك متجرك" };
  await notifyStore(storeId, { type: "store_status", title: labels[status], body: reason || undefined, link: "/dashboard" });
  await audit({ userId: admin.id, storeId, action: `store.status.${status}`, entity: "store", entityId: storeId, meta: { reason } });
  revalidatePath(`/admin/stores/${storeId}`);
  revalidatePath("/admin/stores");
}

export async function adminUpdateStoreAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const id = num(fd, "id");
  const commissionType = s(fd, "commissionType");
  await db
    .update(stores)
    .set({
      isFeatured: bool(fd, "isFeatured"),
      commissionType: commissionType || null,
      commissionValue: commissionType ? String(num(fd, "commissionValue")) : null,
      categoryId: num(fd, "categoryId") || null,
    })
    .where(eq(stores.id, id));
  const planId = num(fd, "planId");
  if (planId) {
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.storeId, id)).orderBy(subscriptions.id).limit(1);
    const cycle = s(fd, "billingCycle") || "monthly";
    const days = cycle === "yearly" ? 365 : plan.durationDays;
    const data = { planId, status: "active", billingCycle: cycle, amount: cycle === "yearly" ? plan.priceYearly : plan.priceMonthly, endsAt: new Date(Date.now() + days * 86400_000) };
    if (sub) await db.update(subscriptions).set(data).where(eq(subscriptions.id, sub.id));
    else await db.insert(subscriptions).values({ storeId: id, ...data });
    await financeLog({ userId: admin.id, storeId: id, action: "subscription.set", entity: "subscription", amount: data.amount, meta: { planId, cycle } });
  }
  await audit({ userId: admin.id, storeId: id, action: "store.admin_update", entity: "store", entityId: id });
  revalidatePath(`/admin/stores/${id}`);
  return { success: "تم حفظ إعدادات المتجر" };
}

export async function adminDeleteStoreAction(storeId: number) {
  const admin = await requireSuperAdmin();
  await db.delete(stores).where(eq(stores.id, storeId));
  await audit({ userId: admin.id, storeId, action: "store.delete", entity: "store", entityId: storeId });
  redirect("/admin/stores");
}

// ---------- Merchants ----------
export async function adminToggleUserAction(userId: number, active: boolean) {
  const admin = await requireSuperAdmin();
  await db.update(users).set({ isActive: active }).where(and(eq(users.id, userId), ne(users.role, "super_admin")));
  await audit({ userId: admin.id, action: active ? "user.activate" : "user.deactivate", entity: "user", entityId: userId });
  revalidatePath("/admin/merchants");
}

// ---------- Plans ----------
export async function adminSavePlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = num(fd, "id");
  const data = {
    name: s(fd, "name"),
    slug: slugify(s(fd, "slug") || s(fd, "name")),
    description: s(fd, "description"),
    priceMonthly: String(num(fd, "priceMonthly")),
    priceYearly: String(num(fd, "priceYearly")),
    currency: s(fd, "currency") || "YER",
    maxProducts: num(fd, "maxProducts", 50),
    maxStaff: num(fd, "maxStaff", 1),
    maxThemes: num(fd, "maxThemes", 1),
    storageMb: num(fd, "storageMb", 500),
    allowCustomDomain: bool(fd, "allowCustomDomain"),
    allowMarketing: bool(fd, "allowMarketing"),
    allowReports: bool(fd, "allowReports"),
    commissionPercent: String(num(fd, "commissionPercent", 5)),
    durationDays: num(fd, "durationDays", 30),
    isActive: bool(fd, "isActive"),
    sortOrder: num(fd, "sortOrder"),
  };
  if (!data.name) return { error: "اسم الباقة مطلوب" };
  if (id) await db.update(plans).set(data).where(eq(plans.id, id));
  else await db.insert(plans).values(data);
  revalidatePath("/admin/plans");
  return { success: "تم حفظ الباقة" };
}
export async function adminDeletePlanAction(id: number) {
  await requireSuperAdmin();
  try {
    await db.delete(plans).where(eq(plans.id, id));
  } catch {
    await db.update(plans).set({ isActive: false }).where(eq(plans.id, id));
  }
  revalidatePath("/admin/plans");
}

// ---------- Themes ----------
export async function adminSaveThemeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = num(fd, "id");
  let config: ThemeConfig;
  try {
    config = JSON.parse(s(fd, "config") || "{}");
  } catch {
    return { error: "إعدادات القالب (JSON) غير صالحة" };
  }
  const data = {
    name: s(fd, "name"),
    slug: slugify(s(fd, "slug") || s(fd, "name")),
    category: s(fd, "category") || "general",
    description: s(fd, "description"),
    previewImage: s(fd, "previewImage") || null,
    isPaid: bool(fd, "isPaid"),
    price: String(num(fd, "price")),
    isActive: bool(fd, "isActive"),
    minPlanId: num(fd, "minPlanId") || null,
    version: s(fd, "version") || "1.0.0",
    config,
  };
  if (!data.name) return { error: "اسم القالب مطلوب" };
  if (id) await db.update(themes).set(data).where(eq(themes.id, id));
  else await db.insert(themes).values(data);
  revalidatePath("/admin/themes");
  return { success: "تم حفظ القالب" };
}
export async function adminDeleteThemeAction(id: number) {
  await requireSuperAdmin();
  await db.update(stores).set({ themeId: null }).where(eq(stores.themeId, id));
  await db.delete(themes).where(eq(themes.id, id));
  revalidatePath("/admin/themes");
}

// ---------- Payment providers ----------
export async function adminSaveProviderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = num(fd, "id");
  const data = { name: s(fd, "name"), type: s(fd, "type") || "bank", logo: s(fd, "logo") || null, country: s(fd, "country") || "YE", supportsApi: bool(fd, "supportsApi"), isActive: bool(fd, "isActive"), notes: s(fd, "notes") };
  if (!data.name) return { error: "الاسم مطلوب" };
  if (id) await db.update(paymentProviders).set(data).where(eq(paymentProviders.id, id));
  else await db.insert(paymentProviders).values(data);
  revalidatePath("/admin/payments");
  return { success: "تم الحفظ" };
}
export async function adminDeleteProviderAction(id: number) {
  await requireSuperAdmin();
  try {
    await db.delete(paymentProviders).where(eq(paymentProviders.id, id));
  } catch {
    await db.update(paymentProviders).set({ isActive: false }).where(eq(paymentProviders.id, id));
  }
  revalidatePath("/admin/payments");
}
export async function adminVerifyAccountAction(id: number, status: "verified" | "rejected") {
  const admin = await requireSuperAdmin();
  const [acc] = await db.update(storePaymentAccounts).set({ verificationStatus: status }).where(eq(storePaymentAccounts.id, id)).returning();
  if (acc) {
    await notifyStore(acc.storeId, { type: "account_verification", title: status === "verified" ? "تم توثيق حسابك المالي" : "تم رفض توثيق الحساب المالي", link: "/dashboard/finance" });
    await financeLog({ userId: admin.id, storeId: acc.storeId, action: `payment_account.${status}`, entity: "payment_account", entityId: id });
  }
  revalidatePath("/admin/payments");
}

// ---------- Store categories ----------
export async function adminSaveStoreCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const name = s(fd, "name");
  if (!name) return { error: "الاسم مطلوب" };
  await db.insert(storeCategories).values({ name, slug: slugify(s(fd, "slug") || name), icon: s(fd, "icon") || "🏬" });
  revalidatePath("/admin/settings");
  return { success: "تمت الإضافة" };
}
export async function adminDeleteStoreCategoryAction(id: number) {
  await requireSuperAdmin();
  await db.update(stores).set({ categoryId: null }).where(eq(stores.categoryId, id));
  await db.delete(storeCategories).where(eq(storeCategories.id, id));
  revalidatePath("/admin/settings");
}

// ---------- Settings ----------
export async function adminSaveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const keys = ["platform_name", "auto_approve_stores", "default_commission", "support_email", "support_phone", "default_currency", "platform_tagline"];
  for (const k of keys) {
    const v = fd.has(k) ? (fd.get(k) === "on" ? "true" : s(fd, k)) : k === "auto_approve_stores" ? "false" : null;
    if (v === null) continue;
    await db.insert(platformSettings).values({ key: k, value: v }).onConflictDoUpdate({ target: platformSettings.key, set: { value: v } });
  }
  await audit({ userId: admin.id, action: "settings.update", entity: "platform" });
  revalidatePath("/admin/settings");
  return { success: "تم حفظ الإعدادات" };
}

// ---------- Domains (admin) ----------
export async function adminDomainAction(id: number, action: "verify" | "activate" | "fail" | "delete") {
  const admin = await requireSuperAdmin();
  const [d] = await db.select().from(domains).where(eq(domains.id, id));
  if (!d) return;
  if (action === "delete") {
    await db.delete(domains).where(eq(domains.id, id));
  } else if (action === "verify") {
    const r = await verifyDomainDns(d.hostname, d.verificationToken);
    await db.update(domains).set({ dnsChecks: r.checks, status: r.ok ? "verified" : "failed", lastError: r.error ?? null, lastCheckedAt: new Date() }).where(eq(domains.id, id));
  } else if (action === "activate") {
    if (d.status !== "verified" && d.status !== "active") return;
    await db.update(domains).set({ status: "active", sslStatus: "issued", lastError: null }).where(eq(domains.id, id));
    await notifyStore(d.storeId, { type: "domain_active", title: "تم تفعيل الدومين", body: d.hostname, link: "/dashboard/domains" });
  } else if (action === "fail") {
    await db.update(domains).set({ status: "failed", lastError: "تم إيقاف الدومين من إدارة المنصة" }).where(eq(domains.id, id));
  }
  await audit({ userId: admin.id, storeId: d.storeId, action: `domain.${action}`, entity: "domain", entityId: id });
  revalidatePath("/admin/domains");
}

// ---------- Commissions ----------
export async function adminSettleCommissionAction(id: number, status: "settled" | "voided") {
  const admin = await requireSuperAdmin();
  const [c] = await db.update(commissions).set({ status, settledAt: status === "settled" ? new Date() : null }).where(eq(commissions.id, id)).returning();
  if (c) await financeLog({ userId: admin.id, storeId: c.storeId, action: `commission.${status}`, entity: "commission", entityId: id, amount: c.amount });
  revalidatePath("/admin/commissions");
}
