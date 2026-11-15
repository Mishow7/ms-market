"use server";

import { db } from "@/db";
import { addresses, coupons, customers, orderEvents, orderItems, orders, payments, products, reviews, shippingMethods, storePaymentMethods, stores, users, wishlists } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { audit, financeLog, notifyStore } from "@/lib/notify";
import { orderNumber, randomToken } from "@/lib/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./auth";
import { computeShipping } from "@/lib/shipping";

export type CartItem = { productId: number; storeId: number; storeSlug: string; storeName: string; name: string; price: number; qty: number; image?: string; variant?: string; currency: string };

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function validateCouponAction(storeId: number, code: string, subtotal: number, productIds: number[]) {
  const [c] = await db.select().from(coupons).where(and(eq(coupons.storeId, storeId), eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true))).limit(1);
  if (!c) return { error: "الكوبون غير صالح" };
  if (c.expiresAt && c.expiresAt < new Date()) return { error: "انتهت صلاحية الكوبون" };
  if (c.maxUses && c.usedCount >= c.maxUses) return { error: "تم استنفاد هذا الكوبون" };
  if (subtotal < Number(c.minOrder)) return { error: `الحد الأدنى للطلب ${c.minOrder}` };
  if (c.productIds.length && !productIds.some((p) => c.productIds.includes(p))) return { error: "الكوبون لا ينطبق على هذه المنتجات" };
  const discount = c.type === "percent" ? (subtotal * Number(c.value)) / 100 : Math.min(Number(c.value), subtotal);
  return { discount: Math.round(discount * 100) / 100, code: c.code };
}

export async function getShippingOptions(storeId: number) {
  return db.select().from(shippingMethods).where(and(eq(shippingMethods.storeId, storeId), eq(shippingMethods.isActive, true)));
}
export async function getPaymentOptions(storeId: number) {
  return db.select().from(storePaymentMethods).where(and(eq(storePaymentMethods.storeId, storeId), eq(storePaymentMethods.isEnabled, true)));
}

/** Checkout: items may belong to several stores -> one independent order per store (own invoice, own commission). */
export async function checkoutAction(payload: {
  items: CartItem[];
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  notes?: string;
  perStore: Record<number, { shippingMethodId?: number; paymentMethod: string; couponCode?: string; campaignId?: number }>;
}): Promise<{ error?: string; groupId?: string }> {
  const user = await getCurrentUser();
  const { items, name, phone, city, address } = payload;
  if (!items.length) return { error: "السلة فارغة" };
  if (!name || !phone || !city || !address) return { error: "يرجى إدخال بيانات التوصيل كاملة" };
  if (!/^[0-9+\s-]{7,15}$/.test(phone)) return { error: "رقم الهاتف غير صحيح" };

  const productRows = await db.select().from(products).where(inArray(products.id, items.map((i) => i.productId)));
  const byId = new Map(productRows.map((p) => [p.id, p]));
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p || p.status !== "published") return { error: `المنتج ${it.name} غير متاح` };
    if (p.stock < it.qty) return { error: `الكمية المطلوبة من ${p.name} غير متوفرة (المتاح ${p.stock})` };
  }
  const storeIds = [...new Set(items.map((i) => i.storeId))];
  const storeRows = await db.select().from(stores).where(inArray(stores.id, storeIds));
  for (const st of storeRows) if (st.status !== "active") return { error: `المتجر ${st.name} غير متاح حالياً` };

  const groupId = `CHK-${randomToken(10).toUpperCase()}`;
  const createdOrderIds: number[] = [];

  await db.transaction(async (tx) => {
    for (const storeId of storeIds) {
      const st = storeRows.find((x) => x.id === storeId)!;
      const its = items.filter((i) => i.storeId === storeId);
      const opts = payload.perStore[storeId] ?? { paymentMethod: "cod" };
      const [pm] = await tx.select().from(storePaymentMethods).where(and(eq(storePaymentMethods.storeId, storeId), eq(storePaymentMethods.method, opts.paymentMethod), eq(storePaymentMethods.isEnabled, true)));
      if (!pm) throw new Error(`وسيلة الدفع غير مفعلة لدى ${st.name}`);
      const subtotal = its.reduce((a, i) => a + Number(byId.get(i.productId)!.price) * i.qty, 0);
      const weight = its.reduce((a, i) => a + Number(byId.get(i.productId)!.weight ?? 0) * i.qty, 0);
      let discount = 0;
      let couponCode: string | null = null;
      if (opts.couponCode) {
        const r = await validateCouponAction(storeId, opts.couponCode, subtotal, its.map((i) => i.productId));
        if (!("error" in r)) {
          discount = r.discount!;
          couponCode = r.code!;
          await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(and(eq(coupons.storeId, storeId), eq(coupons.code, couponCode)));
        }
      }
      let shippingFee = 0;
      let sm: typeof shippingMethods.$inferSelect | undefined;
      if (opts.shippingMethodId) {
        [sm] = await tx.select().from(shippingMethods).where(and(eq(shippingMethods.id, opts.shippingMethodId), eq(shippingMethods.storeId, storeId)));
        shippingFee = computeShipping(sm, city, weight);
      }
      const total = Math.max(0, subtotal - discount + shippingFee);

      // customer record scoped to this store only
      let customerId: number | null = null;
      if (user) {
        const [existing] = await tx.select().from(customers).where(and(eq(customers.storeId, storeId), eq(customers.userId, user.id)));
        if (existing) {
          customerId = existing.id;
          await tx.update(customers).set({ ordersCount: sql`${customers.ordersCount} + 1`, phone }).where(eq(customers.id, existing.id));
        } else {
          const [c] = await tx.insert(customers).values({ storeId, userId: user.id, name, email: payload.email || user.email, phone, ordersCount: 1 }).returning();
          customerId = c.id;
        }
      } else {
        const [c] = await tx.insert(customers).values({ storeId, name, email: payload.email || null, phone, ordersCount: 1 }).returning();
        customerId = c.id;
      }

      const [o] = await tx
        .insert(orders)
        .values({
          storeId,
          orderNumber: orderNumber(storeId),
          checkoutGroupId: groupId,
          customerId,
          userId: user?.id ?? null,
          customerName: name,
          phone,
          email: payload.email || user?.email || null,
          city,
          address,
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          shippingFee: shippingFee.toFixed(2),
          total: total.toFixed(2),
          currency: st.currency,
          paymentMethod: opts.paymentMethod,
          paymentStatus: "unpaid",
          status: "new",
          shippingMethodId: sm?.id ?? null,
          shippingCarrier: sm?.carrier ?? null,
          couponCode,
          campaignId: opts.campaignId ?? null,
          notes: payload.notes || null,
        })
        .returning();
      createdOrderIds.push(o.id);
      await tx.insert(orderItems).values(
        its.map((i) => {
          const p = byId.get(i.productId)!;
          return { orderId: o.id, storeId, productId: p.id, name: p.name, variant: i.variant ?? null, price: p.price, quantity: i.qty, image: p.images[0] ?? null };
        })
      );
      for (const i of its) {
        await tx.update(products).set({ stock: sql`${products.stock} - ${i.qty}`, salesCount: sql`${products.salesCount} + ${i.qty}` }).where(eq(products.id, i.productId));
      }
      await tx.insert(orderEvents).values({ orderId: o.id, status: "new", note: "تم إنشاء الطلب" });
    }
  });

  for (const id of createdOrderIds) {
    const [o] = await db.select().from(orders).where(eq(orders.id, id));
    await notifyStore(o.storeId, { type: "new_order", title: `طلب جديد ${o.orderNumber}`, body: `${o.customerName} - ${o.total} ${o.currency}`, link: `/dashboard/orders/${o.id}` });
    const lows = await db.select({ id: products.id, name: products.name, stock: products.stock }).from(products).innerJoin(orderItems, eq(orderItems.productId, products.id)).where(and(eq(orderItems.orderId, o.id), sql`${products.stock} <= 3`));
    for (const l of lows) await notifyStore(o.storeId, { type: "low_stock", title: `انخفاض مخزون: ${l.name}`, body: `المتبقي ${l.stock}`, link: `/dashboard/products/${l.id}` });
    await audit({ userId: user?.id, storeId: o.storeId, action: "order.create", entity: "order", entityId: o.id, meta: { groupId } });
  }
  return { groupId };
}

/** Customer submits transfer proof. Order stays "pending_review" until merchant verifies the funds arrived. */
export async function submitPaymentProofAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const orderId = Number(fd.get("orderId"));
  const txn = s(fd, "transactionNumber");
  const receiptUrl = s(fd, "receiptUrl");
  const accountId = Number(fd.get("accountId") || 0) || null;
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return { error: "الطلب غير موجود" };
  const user = await getCurrentUser();
  if (o.userId && (!user || user.id !== o.userId)) return { error: "غير مصرح" };
  if (!txn && !receiptUrl) return { error: "أدخل رقم العملية أو أرفق صورة الإيصال" };
  if (o.paymentStatus === "paid") return { error: "الطلب مدفوع مسبقاً" };
  const receiptHash = receiptUrl ? createHash("sha256").update(receiptUrl).digest("hex") : null;
  // duplicate receipt / transaction prevention (per store)
  if (txn) {
    const dup = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.storeId, o.storeId), eq(payments.transactionNumber, txn))).limit(1);
    if (dup.length) return { error: "رقم العملية مستخدم مسبقاً في عملية أخرى" };
  }
  if (receiptHash) {
    const dup = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.storeId, o.storeId), eq(payments.receiptHash, receiptHash))).limit(1);
    if (dup.length) return { error: "هذا الإيصال مرفق مسبقاً" };
  }
  const reference = `PAY-${o.storeId}-${randomToken(8).toUpperCase()}`;
  const [p] = await db.insert(payments).values({ storeId: o.storeId, orderId: o.id, accountId, method: o.paymentMethod, amount: o.total, currency: o.currency, reference, transactionNumber: txn || null, receiptUrl: receiptUrl || null, receiptHash, status: "pending", source: "manual" }).returning();
  await db.update(orders).set({ paymentStatus: "pending_review", updatedAt: new Date() }).where(eq(orders.id, o.id));
  await db.insert(orderEvents).values({ orderId: o.id, status: "payment_submitted", note: `مرجع ${reference}` });
  await notifyStore(o.storeId, { type: "payment_review", title: `إيصال دفع جديد للطلب ${o.orderNumber}`, body: `بانتظار التحقق - ${reference}`, link: `/dashboard/payments` });
  await financeLog({ userId: user?.id, storeId: o.storeId, action: "payment.submitted", entity: "payment", entityId: p.id, amount: o.total, meta: { reference } });
  revalidatePath(`/account/orders/${o.id}`);
  return { success: `تم استلام إثبات الدفع (المرجع ${reference}). سيتم التحقق من وصول المبلغ قبل اعتماد الطلب.` };
}

export async function addReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "سجّل الدخول لإضافة تقييم" };
  const productId = Number(fd.get("productId"));
  const rating = Math.min(5, Math.max(1, Number(fd.get("rating") || 5)));
  const [p] = await db.select({ storeId: products.storeId }).from(products).where(eq(products.id, productId));
  if (!p) return { error: "المنتج غير موجود" };
  await db.insert(reviews).values({ storeId: p.storeId, productId, userId: user.id, rating, comment: s(fd, "comment") });
  revalidatePath(`/s/${s(fd, "storeSlug")}/p/${productId}`);
  return { success: "شكراً لتقييمك" };
}

export async function toggleWishlistAction(productId: number, storeSlug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/s/${storeSlug}/p/${productId}`);
  const [ex] = await db.select().from(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)));
  if (ex) await db.delete(wishlists).where(eq(wishlists.id, ex.id));
  else await db.insert(wishlists).values({ userId: user.id, productId });
  revalidatePath(`/s/${storeSlug}/p/${productId}`);
  revalidatePath("/account/wishlist");
}

export async function saveAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };
  const city = s(fd, "city");
  if (!city) return { error: "المدينة مطلوبة" };
  const id = Number(fd.get("id") || 0);
  const data = { label: s(fd, "label") || "المنزل", city, area: s(fd, "area"), street: s(fd, "street"), phone: s(fd, "phone"), isDefault: fd.get("isDefault") === "on" };
  if (data.isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  if (id) await db.update(addresses).set(data).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  else await db.insert(addresses).values({ ...data, userId: user.id });
  revalidatePath("/account/addresses");
  return { success: "تم حفظ العنوان" };
}
export async function deleteAddressAction(id: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath("/account/addresses");
}
export async function customerCancelOrderAction(orderId: number) {
  const user = await getCurrentUser();
  if (!user) return;
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, user.id)));
  if (!o || !["new", "confirming"].includes(o.status)) return;
  await db.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, orderId));
  await db.insert(orderEvents).values({ orderId, status: "cancelled", note: "ألغى العميل الطلب", byUserId: user.id });
  const its = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const i of its) if (i.productId) await db.update(products).set({ stock: sql`${products.stock} + ${i.quantity}` }).where(eq(products.id, i.productId));
  await notifyStore(o.storeId, { type: "order_cancelled", title: `تم إلغاء الطلب ${o.orderNumber} من قبل العميل`, link: `/dashboard/orders/${o.id}` });
  revalidatePath(`/account/orders/${orderId}`);
}
export async function markCustomerNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  const { notifications } = await import("@/db/schema");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/account/notifications");
}
export async function getUserEmail(userId: number) {
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  return u?.email;
}
