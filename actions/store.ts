"use server";

import { db } from "@/db";
import {
  campaigns, categories, coupons, customers, domains, notifications, orderEvents, orders, pageVersions, pages, payments, plans, products, shippingMethods,
  storeMembers, storePaymentAccounts, storePaymentMethods, stores, subscriptions, themes, users, commissions, type PageSection, type StaffPermissions, type ThemeConfig, type ProductVariant,
} from "@/db/schema";
import { hashPassword, requireStore } from "@/lib/auth";
import { audit, financeLog, notifyStore, notifyUser } from "@/lib/notify";
import { randomToken, slugify } from "@/lib/utils";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./auth";
import { verifyDomainDns } from "@/lib/domains";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string, d = 0) => (fd.get(k) === null || fd.get(k) === "" ? d : Number(fd.get(k)));
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const list = (fd: FormData, k: string) => s(fd, k).split(/\n|,/).map((x) => x.trim()).filter(Boolean);

async function currentPlan(storeId: number) {
  const [row] = await db.select({ plan: plans, sub: subscriptions }).from(subscriptions).innerJoin(plans, eq(plans.id, subscriptions.planId)).where(eq(subscriptions.storeId, storeId)).orderBy(desc(subscriptions.id)).limit(1);
  return row ?? null;
}

// ---------- Categories ----------
export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("products");
  const id = num(fd, "id");
  const name = s(fd, "name");
  if (!name) return { error: "اسم التصنيف مطلوب" };
  const data = { name, slug: slugify(s(fd, "slug") || name), parentId: num(fd, "parentId") || null, image: s(fd, "image") || null, sortOrder: num(fd, "sortOrder") };
  if (id) await db.update(categories).set(data).where(and(eq(categories.id, id), eq(categories.storeId, store.id)));
  else await db.insert(categories).values({ ...data, storeId: store.id });
  revalidatePath("/dashboard/categories");
  return { success: "تم حفظ التصنيف" };
}
export async function deleteCategoryAction(id: number) {
  const { store } = await requireStore("products");
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.storeId, store.id)));
  revalidatePath("/dashboard/categories");
}

// ---------- Products ----------
export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store, user } = await requireStore("products");
  const id = num(fd, "id");
  const name = s(fd, "name");
  const price = num(fd, "price");
  if (!name || price < 0) return { error: "اسم المنتج والسعر مطلوبان" };
  if (!id) {
    const p = await currentPlan(store.id);
    const [{ c }] = await db.select({ c: count() }).from(products).where(eq(products.storeId, store.id));
    if (p && c >= p.plan.maxProducts) return { error: `وصلت للحد الأقصى للمنتجات في باقتك (${p.plan.maxProducts}). قم بترقية الباقة.` };
  }
  let variants: ProductVariant[] = [];
  let options: { name: string; values: string[] }[] = [];
  try {
    variants = JSON.parse(s(fd, "variants") || "[]");
    options = JSON.parse(s(fd, "options") || "[]");
  } catch {
    return { error: "بيانات المتغيرات غير صالحة" };
  }
  const baseSlug = slugify(s(fd, "slug") || name);
  const data = {
    name,
    shortDescription: s(fd, "shortDescription"),
    description: s(fd, "description"),
    price: String(price),
    comparePrice: num(fd, "comparePrice") ? String(num(fd, "comparePrice")) : null,
    sku: s(fd, "sku") || null,
    stock: num(fd, "stock"),
    weight: num(fd, "weight") ? String(num(fd, "weight")) : null,
    categoryId: num(fd, "categoryId") || null,
    brand: s(fd, "brand") || null,
    images: list(fd, "images"),
    video: s(fd, "video") || null,
    options,
    variants,
    isFeatured: bool(fd, "isFeatured"),
    isBestSeller: bool(fd, "isBestSeller"),
    status: s(fd, "status") || "draft",
    seoTitle: s(fd, "seoTitle") || null,
    seoDescription: s(fd, "seoDescription") || null,
    updatedAt: new Date(),
  };
  if (id) {
    await db.update(products).set(data).where(and(eq(products.id, id), eq(products.storeId, store.id)));
  } else {
    const clash = await db.select({ id: products.id }).from(products).where(and(eq(products.storeId, store.id), eq(products.slug, baseSlug))).limit(1);
    const slug = clash.length ? `${baseSlug}-${randomToken(4)}` : baseSlug;
    await db.insert(products).values({ ...data, slug, storeId: store.id });
  }
  await audit({ userId: user.id, storeId: store.id, action: id ? "product.update" : "product.create", entity: "product", entityId: id || null });
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products?saved=1");
}
export async function deleteProductAction(id: number) {
  const { store, user } = await requireStore("products");
  await db.delete(products).where(and(eq(products.id, id), eq(products.storeId, store.id)));
  await audit({ userId: user.id, storeId: store.id, action: "product.delete", entity: "product", entityId: id });
  revalidatePath("/dashboard/products");
}
export async function duplicateProductAction(id: number) {
  const { store } = await requireStore("products");
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.storeId, store.id)));
  if (!p) return;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
  void _id; void _c; void _u;
  await db.insert(products).values({ ...rest, name: `${p.name} (نسخة)`, slug: `${p.slug}-${randomToken(4)}`, status: "draft", salesCount: 0 });
  revalidatePath("/dashboard/products");
}
export async function toggleProductFlagAction(id: number, field: "isFeatured" | "isBestSeller" | "status", value: boolean | string) {
  const { store } = await requireStore("products");
  await db.update(products).set({ [field]: value } as Partial<typeof products.$inferInsert>).where(and(eq(products.id, id), eq(products.storeId, store.id)));
  revalidatePath("/dashboard/products");
}

// ---------- Orders ----------
export async function updateOrderStatusAction(orderId: number, status: string, note?: string) {
  const { store, user } = await requireStore("orders");
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.storeId, store.id)));
  if (!o) return;
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await db.insert(orderEvents).values({ orderId, status, note, byUserId: user.id });
  // commissions are only earned from eligible orders: void on cancel/return
  if (status === "cancelled" || status === "returned") {
    await db.update(commissions).set({ status: "voided" }).where(and(eq(commissions.orderId, orderId), eq(commissions.status, "pending")));
    await financeLog({ userId: user.id, storeId: store.id, action: `order.${status}`, entity: "order", entityId: orderId, amount: o.total });
  }
  if (status === "completed" && o.paymentStatus === "paid") await ensureCommission(orderId);
  if (o.userId) {
    const labels: Record<string, string> = { confirming: "قيد التأكيد", processing: "قيد التجهيز", ready: "جاهز للشحن", shipped: "تم شحن طلبك", completed: "اكتمل طلبك", cancelled: "تم إلغاء طلبك", returned: "تم تسجيل الاسترجاع" };
    await notifyUser(o.userId, { type: "order_status", title: `طلب ${o.orderNumber}: ${labels[status] ?? status}`, link: `/account/orders/${o.id}`, storeId: store.id });
  }
  await audit({ userId: user.id, storeId: store.id, action: `order.status.${status}`, entity: "order", entityId: orderId });
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
}
export async function updateOrderShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("orders");
  const id = num(fd, "id");
  await db.update(orders).set({ shippingCarrier: s(fd, "carrier") || null, trackingNumber: s(fd, "tracking") || null, notes: s(fd, "notes") || null, updatedAt: new Date() }).where(and(eq(orders.id, id), eq(orders.storeId, store.id)));
  revalidatePath(`/dashboard/orders/${id}`);
  return { success: "تم تحديث بيانات الشحن" };
}

async function ensureCommission(orderId: number) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return;
  const exists = await db.select({ id: commissions.id }).from(commissions).where(eq(commissions.orderId, orderId)).limit(1);
  if (exists.length) return;
  const [st] = await db.select().from(stores).where(eq(stores.id, o.storeId));
  const p = await currentPlan(o.storeId);
  let rateType = "percent";
  let rateValue = Number(p?.plan.commissionPercent ?? 5);
  if (st?.commissionType) {
    rateType = st.commissionType;
    rateValue = Number(st.commissionValue ?? 0);
  }
  // Eligible base = goods total after discounts, excluding shipping
  const base = Number(o.subtotal) - Number(o.discount);
  const amount = rateType === "percent" ? (base * rateValue) / 100 : rateValue;
  await db.insert(commissions).values({ storeId: o.storeId, orderId, orderTotal: String(base), rateType, rateValue: String(rateValue), amount: amount.toFixed(2), status: "pending" });
  await financeLog({ storeId: o.storeId, action: "commission.accrued", entity: "order", entityId: orderId, amount: amount.toFixed(2), meta: { rateType, rateValue, base } });
}

// ---------- Payments verification ----------
export async function verifyPaymentAction(paymentId: number, status: "verified" | "rejected", note?: string) {
  const { store, user, permissions } = await requireStore("finance");
  if (!permissions.finance) return;
  const [p] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.storeId, store.id)));
  if (!p || p.status !== "pending") return;
  await db.update(payments).set({ status, verifiedBy: user.id, verifiedAt: new Date(), notes: note ?? null }).where(eq(payments.id, paymentId));
  const [o] = await db.select().from(orders).where(eq(orders.id, p.orderId));
  if (o) {
    await db.update(orders).set({ paymentStatus: status === "verified" ? "paid" : "rejected", status: status === "verified" && o.status === "new" ? "confirming" : o.status, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await db.insert(orderEvents).values({ orderId: o.id, status: status === "verified" ? "payment_verified" : "payment_rejected", note, byUserId: user.id });
    if (status === "verified") {
      await ensureCommission(o.id);
      await db.update(customers).set({ totalSpent: sql`${customers.totalSpent} + ${o.total}` }).where(and(eq(customers.storeId, store.id), eq(customers.id, o.customerId ?? -1)));
    }
    if (o.userId) await notifyUser(o.userId, { type: status === "verified" ? "payment_confirmed" : "payment_rejected", title: status === "verified" ? `تم تأكيد دفع الطلب ${o.orderNumber}` : `تم رفض إيصال الدفع للطلب ${o.orderNumber}`, body: note, link: `/account/orders/${o.id}`, storeId: store.id });
  }
  await financeLog({ userId: user.id, storeId: store.id, action: `payment.${status}`, entity: "payment", entityId: paymentId, amount: p.amount, meta: { reference: p.reference } });
  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/orders/${p.orderId}`);
}

// ---------- Customers ----------
export async function updateCustomerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("customers");
  const id = num(fd, "id");
  await db.update(customers).set({ notes: s(fd, "notes"), tag: s(fd, "tag") || "regular" }).where(and(eq(customers.id, id), eq(customers.storeId, store.id)));
  revalidatePath(`/dashboard/customers/${id}`);
  return { success: "تم الحفظ" };
}

// ---------- Finance accounts & methods ----------
export async function savePaymentAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store, user } = await requireStore("finance");
  const id = num(fd, "id");
  const data = {
    providerId: num(fd, "providerId"),
    accountName: s(fd, "accountName"),
    accountNumber: s(fd, "accountNumber") || null,
    iban: s(fd, "iban") || null,
    walletNumber: s(fd, "walletNumber") || null,
    walletPhone: s(fd, "walletPhone") || null,
    currency: s(fd, "currency") || "YER",
    proofUrl: s(fd, "proofUrl") || null,
    isActive: bool(fd, "isActive"),
  };
  if (!data.providerId || !data.accountName) return { error: "اختر البنك/المحفظة وأدخل اسم صاحب الحساب" };
  if (id) await db.update(storePaymentAccounts).set({ ...data, verificationStatus: "pending" }).where(and(eq(storePaymentAccounts.id, id), eq(storePaymentAccounts.storeId, store.id)));
  else await db.insert(storePaymentAccounts).values({ ...data, storeId: store.id });
  await financeLog({ userId: user.id, storeId: store.id, action: id ? "payment_account.update" : "payment_account.create", entity: "payment_account", entityId: id || null });
  revalidatePath("/dashboard/finance");
  return { success: "تم حفظ الحساب وسيتم مراجعته للتوثيق" };
}
export async function deletePaymentAccountAction(id: number) {
  const { store, user } = await requireStore("finance");
  await db.delete(storePaymentAccounts).where(and(eq(storePaymentAccounts.id, id), eq(storePaymentAccounts.storeId, store.id)));
  await financeLog({ userId: user.id, storeId: store.id, action: "payment_account.delete", entity: "payment_account", entityId: id });
  revalidatePath("/dashboard/finance");
}
export async function savePaymentMethodsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store, user } = await requireStore("finance");
  for (const m of ["bank_transfer", "wallet", "cod", "gateway"]) {
    const data = { isEnabled: bool(fd, `${m}_enabled`), instructions: s(fd, `${m}_instructions`), feePercent: String(num(fd, `${m}_fee`)) };
    await db.insert(storePaymentMethods).values({ storeId: store.id, method: m, ...data }).onConflictDoUpdate({ target: [storePaymentMethods.storeId, storePaymentMethods.method], set: data });
  }
  await financeLog({ userId: user.id, storeId: store.id, action: "payment_methods.update", entity: "store", entityId: store.id });
  revalidatePath("/dashboard/finance");
  return { success: "تم حفظ وسائل الدفع" };
}

// ---------- Shipping ----------
export async function saveShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("settings");
  const id = num(fd, "id");
  let rules: { city?: string; area?: string; price: string; maxWeight?: number }[] = [];
  try {
    rules = JSON.parse(s(fd, "rules") || "[]");
  } catch {
    return { error: "قواعد الأسعار غير صالحة" };
  }
  const data = { name: s(fd, "name"), type: s(fd, "type") || "flat", price: String(num(fd, "price")), rules, eta: s(fd, "eta") || null, carrier: s(fd, "carrier") || null, isActive: bool(fd, "isActive") };
  if (!data.name) return { error: "اسم طريقة الشحن مطلوب" };
  if (id) await db.update(shippingMethods).set(data).where(and(eq(shippingMethods.id, id), eq(shippingMethods.storeId, store.id)));
  else await db.insert(shippingMethods).values({ ...data, storeId: store.id });
  revalidatePath("/dashboard/shipping");
  return { success: "تم الحفظ" };
}
export async function deleteShippingAction(id: number) {
  const { store } = await requireStore("settings");
  await db.delete(shippingMethods).where(and(eq(shippingMethods.id, id), eq(shippingMethods.storeId, store.id)));
  revalidatePath("/dashboard/shipping");
}

// ---------- Coupons ----------
export async function saveCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("marketing");
  const id = num(fd, "id");
  const code = s(fd, "code").toUpperCase();
  if (!code) return { error: "كود الكوبون مطلوب" };
  const data = {
    code,
    type: s(fd, "type") || "percent",
    value: String(num(fd, "value")),
    minOrder: String(num(fd, "minOrder")),
    maxUses: num(fd, "maxUses") || null,
    expiresAt: s(fd, "expiresAt") ? new Date(s(fd, "expiresAt")) : null,
    productIds: list(fd, "productIds").map(Number).filter(Boolean),
    categoryIds: list(fd, "categoryIds").map(Number).filter(Boolean),
    isActive: bool(fd, "isActive"),
  };
  try {
    if (id) await db.update(coupons).set(data).where(and(eq(coupons.id, id), eq(coupons.storeId, store.id)));
    else await db.insert(coupons).values({ ...data, storeId: store.id });
  } catch {
    return { error: "كود الكوبون مستخدم مسبقاً" };
  }
  revalidatePath("/dashboard/coupons");
  return { success: "تم حفظ الكوبون" };
}
export async function deleteCouponAction(id: number) {
  const { store } = await requireStore("marketing");
  await db.delete(coupons).where(and(eq(coupons.id, id), eq(coupons.storeId, store.id)));
  revalidatePath("/dashboard/coupons");
}

// ---------- Campaigns ----------
export async function saveCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("marketing");
  const p = await currentPlan(store.id);
  if (p && !p.plan.allowMarketing) return { error: "أدوات التسويق غير متاحة في باقتك الحالية" };
  const id = num(fd, "id");
  const data = {
    title: s(fd, "title"),
    description: s(fd, "description"),
    image: s(fd, "image") || null,
    video: s(fd, "video") || null,
    link: s(fd, "link") || null,
    placement: s(fd, "placement") || "home_top",
    productId: num(fd, "productId") || null,
    categoryId: num(fd, "categoryId") || null,
    startsAt: s(fd, "startsAt") ? new Date(s(fd, "startsAt")) : null,
    endsAt: s(fd, "endsAt") ? new Date(s(fd, "endsAt")) : null,
    cost: String(num(fd, "cost")),
    status: s(fd, "status") || "active",
  };
  if (!data.title) return { error: "عنوان الحملة مطلوب" };
  if (id) await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.storeId, store.id)));
  else await db.insert(campaigns).values({ ...data, storeId: store.id });
  revalidatePath("/dashboard/campaigns");
  return { success: "تم حفظ الحملة" };
}
export async function setCampaignStatusAction(id: number, status: string) {
  const { store } = await requireStore("marketing");
  await db.update(campaigns).set({ status }).where(and(eq(campaigns.id, id), eq(campaigns.storeId, store.id)));
  revalidatePath("/dashboard/campaigns");
}
export async function deleteCampaignAction(id: number) {
  const { store } = await requireStore("marketing");
  await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.storeId, store.id)));
  revalidatePath("/dashboard/campaigns");
}

// ---------- Theme ----------
export async function applyThemeAction(themeId: number) {
  const { store, user } = await requireStore("design");
  const [t] = await db.select().from(themes).where(and(eq(themes.id, themeId), eq(themes.isActive, true)));
  if (!t) return { error: "القالب غير متاح" };
  const p = await currentPlan(store.id);
  if (t.minPlanId && p && p.plan.id < t.minPlanId) return { error: "هذا القالب يتطلب باقة أعلى" };
  // Theme switch never touches products/orders: only store.themeId & theme overrides
  await db.update(stores).set({ previousThemeId: store.themeId, themeId, themeOverrides: {} }).where(eq(stores.id, store.id));
  // seed home page sections from the theme if the page has no content
  const [pg] = await db.select().from(pages).where(and(eq(pages.storeId, store.id), eq(pages.slug, "home")));
  if (!pg) await db.insert(pages).values({ storeId: store.id, name: "الصفحة الرئيسية", slug: "home", draft: t.config.sections, published: t.config.sections, publishedAt: new Date() });
  else if (pg.published.length === 0) await db.update(pages).set({ draft: t.config.sections, published: t.config.sections, publishedAt: new Date() }).where(eq(pages.id, pg.id));
  await audit({ userId: user.id, storeId: store.id, action: "theme.apply", entity: "theme", entityId: themeId });
  revalidatePath("/dashboard/themes");
  return { success: "تم تطبيق القالب" };
}
export async function restorePreviousThemeAction() {
  const { store } = await requireStore("design");
  if (!store.previousThemeId) return;
  await db.update(stores).set({ themeId: store.previousThemeId, previousThemeId: store.themeId }).where(eq(stores.id, store.id));
  revalidatePath("/dashboard/themes");
}
export async function saveThemeOverridesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store } = await requireStore("design");
  const overrides: Partial<ThemeConfig> = {
    primary: s(fd, "primary") || undefined,
    secondary: s(fd, "secondary") || undefined,
    accent: s(fd, "accent") || undefined,
    background: s(fd, "background") || undefined,
    text: s(fd, "text") || undefined,
    font: s(fd, "font") || undefined,
    radius: s(fd, "radius") || undefined,
    headerStyle: (s(fd, "headerStyle") as ThemeConfig["headerStyle"]) || undefined,
  };
  await db.update(stores).set({ themeOverrides: overrides, colors: { primary: overrides.primary || store.colors.primary, secondary: overrides.secondary || store.colors.secondary } }).where(eq(stores.id, store.id));
  revalidatePath("/dashboard/themes");
  return { success: "تم حفظ التخصيص" };
}

// ---------- Page builder ----------
export async function savePageDraftAction(sections: PageSection[]) {
  const { store } = await requireStore("design");
  const [pg] = await db.select().from(pages).where(and(eq(pages.storeId, store.id), eq(pages.slug, "home")));
  if (pg) await db.update(pages).set({ draft: sections, updatedAt: new Date() }).where(eq(pages.id, pg.id));
  else await db.insert(pages).values({ storeId: store.id, name: "الصفحة الرئيسية", slug: "home", draft: sections });
  return { success: "تم حفظ المسودة" };
}
export async function publishPageAction(sections: PageSection[]) {
  const { store, user } = await requireStore("design");
  let [pg] = await db.select().from(pages).where(and(eq(pages.storeId, store.id), eq(pages.slug, "home")));
  if (!pg) [pg] = await db.insert(pages).values({ storeId: store.id, name: "الصفحة الرئيسية", slug: "home", draft: sections }).returning();
  if (pg.published.length) await db.insert(pageVersions).values({ pageId: pg.id, content: pg.published, label: `إصدار ${new Date().toLocaleString("ar-EG")}` });
  await db.update(pages).set({ draft: sections, published: sections, publishedAt: new Date(), updatedAt: new Date() }).where(eq(pages.id, pg.id));
  await audit({ userId: user.id, storeId: store.id, action: "page.publish", entity: "page", entityId: pg.id });
  revalidatePath(`/s/${store.slug}`);
  return { success: "تم نشر التعديلات" };
}
export async function restorePageVersionAction(versionId: number) {
  const { store } = await requireStore("design");
  const [v] = await db.select({ v: pageVersions, pg: pages }).from(pageVersions).innerJoin(pages, eq(pages.id, pageVersions.pageId)).where(and(eq(pageVersions.id, versionId), eq(pages.storeId, store.id)));
  if (!v) return;
  await db.update(pages).set({ draft: v.v.content, updatedAt: new Date() }).where(eq(pages.id, v.pg.id));
  revalidatePath("/dashboard/builder");
}

// ---------- Domains ----------
export async function addDomainAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store, user } = await requireStore("settings");
  const p = await currentPlan(store.id);
  if (p && !p.plan.allowCustomDomain) return { error: "ربط دومين خاص غير متاح في باقتك الحالية" };
  const hostname = s(fd, "hostname").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(hostname)) return { error: "صيغة الدومين غير صحيحة" };
  const dup = await db.select({ storeId: domains.storeId }).from(domains).where(eq(domains.hostname, hostname)).limit(1);
  if (dup.length) return { error: dup[0].storeId === store.id ? "هذا الدومين مضاف مسبقاً" : "هذا الدومين مرتبط بمتجر آخر" };
  await db.insert(domains).values({ storeId: store.id, hostname, type: "custom", verificationToken: `ms-verify-${randomToken(20)}`, status: "pending" });
  await audit({ userId: user.id, storeId: store.id, action: "domain.add", entity: "domain", meta: { hostname } });
  revalidatePath("/dashboard/domains");
  return { success: "تمت إضافة الدومين. اتبع إرشادات DNS ثم اضغط تحقق." };
}
export async function verifyDomainAction(id: number) {
  const { store } = await requireStore("settings");
  const [d] = await db.select().from(domains).where(and(eq(domains.id, id), eq(domains.storeId, store.id)));
  if (!d || d.type !== "custom") return;
  await db.update(domains).set({ status: "verifying" }).where(eq(domains.id, id));
  const r = await verifyDomainDns(d.hostname, d.verificationToken);
  await db.update(domains).set({ dnsChecks: r.checks, status: r.ok ? "verified" : "failed", lastError: r.error ?? null, lastCheckedAt: new Date(), sslStatus: r.ok ? "pending" : d.sslStatus }).where(eq(domains.id, id));
  if (r.ok) await notifyStore(store.id, { type: "domain_verified", title: "تم التحقق من الدومين", body: `${d.hostname} بانتظار التفعيل النهائي وإصدار SSL`, link: "/dashboard/domains" });
  revalidatePath("/dashboard/domains");
}
export async function setPrimaryDomainAction(id: number) {
  const { store } = await requireStore("settings");
  const [d] = await db.select().from(domains).where(and(eq(domains.id, id), eq(domains.storeId, store.id)));
  if (!d || d.status !== "active") return;
  await db.update(domains).set({ isPrimary: false }).where(eq(domains.storeId, store.id));
  await db.update(domains).set({ isPrimary: true }).where(eq(domains.id, id));
  revalidatePath("/dashboard/domains");
}
export async function deleteDomainAction(id: number) {
  const { store } = await requireStore("settings");
  await db.delete(domains).where(and(eq(domains.id, id), eq(domains.storeId, store.id), eq(domains.type, "custom")));
  revalidatePath("/dashboard/domains");
}

// ---------- Staff ----------
export async function saveStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store, role } = await requireStore("settings");
  if (role === "staff") return { error: "غير مصرح" };
  const p = await currentPlan(store.id);
  const email = s(fd, "email").toLowerCase();
  const name = s(fd, "name");
  const password = s(fd, "password");
  const permissions: StaffPermissions = { products: bool(fd, "p_products"), orders: bool(fd, "p_orders"), customers: bool(fd, "p_customers"), marketing: bool(fd, "p_marketing"), finance: bool(fd, "p_finance"), design: bool(fd, "p_design"), settings: bool(fd, "p_settings") };
  const memberId = num(fd, "memberId");
  if (memberId) {
    await db.update(storeMembers).set({ permissions }).where(and(eq(storeMembers.id, memberId), eq(storeMembers.storeId, store.id), eq(storeMembers.role, "staff")));
    revalidatePath("/dashboard/staff");
    return { success: "تم تحديث الصلاحيات" };
  }
  const [{ c }] = await db.select({ c: count() }).from(storeMembers).where(and(eq(storeMembers.storeId, store.id), eq(storeMembers.role, "staff")));
  if (p && c >= p.plan.maxStaff) return { error: `وصلت للحد الأقصى للموظفين في باقتك (${p.plan.maxStaff})` };
  let [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u) {
    if (!name || password.length < 6) return { error: "أدخل الاسم وكلمة مرور (6 أحرف+) للموظف الجديد" };
    [u] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password), role: "staff" }).returning();
  } else if (u.role === "super_admin") return { error: "لا يمكن إضافة هذا المستخدم" };
  try {
    await db.insert(storeMembers).values({ storeId: store.id, userId: u.id, role: "staff", permissions });
  } catch {
    return { error: "هذا المستخدم عضو بالفعل" };
  }
  await notifyUser(u.id, { type: "staff_added", title: `تمت إضافتك كموظف في ${store.name}`, link: "/dashboard", storeId: store.id });
  revalidatePath("/dashboard/staff");
  return { success: "تمت إضافة الموظف" };
}
export async function removeStaffAction(memberId: number) {
  const { store, role } = await requireStore("settings");
  if (role === "staff") return;
  await db.delete(storeMembers).where(and(eq(storeMembers.id, memberId), eq(storeMembers.storeId, store.id), ne(storeMembers.role, "owner")));
  revalidatePath("/dashboard/staff");
}

// ---------- Settings ----------
export async function saveStoreSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { store, user } = await requireStore("settings");
  const socials: Record<string, string> = {};
  for (const k of ["facebook", "instagram", "whatsapp", "tiktok", "x"]) if (s(fd, `social_${k}`)) socials[k] = s(fd, `social_${k}`);
  await db
    .update(stores)
    .set({
      name: s(fd, "name") || store.name,
      ownerName: s(fd, "ownerName") || store.ownerName,
      description: s(fd, "description"),
      logo: s(fd, "logo") || null,
      cover: s(fd, "cover") || null,
      banner: s(fd, "banner") || null,
      extraBanners: list(fd, "extraBanners"),
      email: s(fd, "email") || null,
      phone: s(fd, "phone") || null,
      city: s(fd, "city") || null,
      country: s(fd, "country") || "اليمن",
      currency: s(fd, "currency") || "YER",
      categoryId: num(fd, "categoryId") || null,
      colors: { primary: s(fd, "primary") || store.colors.primary, secondary: s(fd, "secondary") || store.colors.secondary },
      socials,
    })
    .where(eq(stores.id, store.id));
  await audit({ userId: user.id, storeId: store.id, action: "store.settings", entity: "store", entityId: store.id });
  revalidatePath("/dashboard/settings");
  return { success: "تم حفظ إعدادات المتجر" };
}

export async function markNotificationsReadAction() {
  const { user } = await requireStore();
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/dashboard/notifications");
}
