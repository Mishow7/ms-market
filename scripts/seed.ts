/* Seed demo data. Run: npx tsx scripts/seed.ts   (remove with: npx tsx scripts/seed.ts --reset) */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomBytes, scryptSync } from "crypto";
import { eq, sql } from "drizzle-orm";
import * as s from "../src/db/schema";
import { baseSections, defaultThemeConfig } from "../src/lib/themes";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const hash = (p: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`; };
const HOST = (process.env.PLATFORM_HOST || "localhost:3000").split(":")[0];

async function main() {
  if (process.argv.includes("--reset")) {
    await db.execute(sql`TRUNCATE users, plans, store_categories, themes, payment_providers, platform_settings, stores RESTART IDENTITY CASCADE`);
    console.log("reset done");
  }
  const [existing] = await db.select().from(s.users).where(eq(s.users.email, "admin@mscommerce.com"));
  if (existing) { console.log("already seeded"); return; }

  const [admin] = await db.insert(s.users).values({ name: "مالك المنصة", email: "admin@mscommerce.com", passwordHash: hash("Admin@123"), role: "super_admin", phone: "777000000" }).returning();
  const [m1] = await db.insert(s.users).values({ name: "أحمد الحميري", email: "merchant@mscommerce.com", passwordHash: hash("Merchant@123"), role: "merchant", phone: "771111111" }).returning();
  const [m2] = await db.insert(s.users).values({ name: "سارة العبسي", email: "merchant2@mscommerce.com", passwordHash: hash("Merchant@123"), role: "merchant", phone: "772222222" }).returning();
  const [staff] = await db.insert(s.users).values({ name: "موظف المتجر", email: "staff@mscommerce.com", passwordHash: hash("Staff@123"), role: "staff" }).returning();
  const [cust] = await db.insert(s.users).values({ name: "عميل تجريبي", email: "customer@mscommerce.com", passwordHash: hash("Customer@123"), role: "customer", phone: "773333333" }).returning();

  const plans = await db.insert(s.plans).values([
    { name: "مجانية", slug: "free", description: "للبداية والتجربة", priceMonthly: "0", priceYearly: "0", maxProducts: 20, maxStaff: 1, maxThemes: 1, storageMb: 200, allowCustomDomain: false, allowMarketing: false, commissionPercent: "8", sortOrder: 1 },
    { name: "أساسية", slug: "basic", description: "للمتاجر الصغيرة", priceMonthly: "7500", priceYearly: "75000", maxProducts: 200, maxStaff: 3, maxThemes: 3, storageMb: 2000, allowCustomDomain: false, allowMarketing: true, commissionPercent: "6", sortOrder: 2 },
    { name: "احترافية", slug: "pro", description: "الأكثر شيوعاً", priceMonthly: "15000", priceYearly: "150000", maxProducts: 2000, maxStaff: 10, maxThemes: 10, storageMb: 10000, allowCustomDomain: true, allowMarketing: true, commissionPercent: "5", sortOrder: 3 },
    { name: "متقدمة", slug: "enterprise", description: "للعلامات الكبيرة", priceMonthly: "35000", priceYearly: "350000", maxProducts: 100000, maxStaff: 50, maxThemes: 100, storageMb: 100000, allowCustomDomain: true, allowMarketing: true, commissionPercent: "3", sortOrder: 4 },
  ]).returning();

  const cats = await db.insert(s.storeCategories).values([
    { name: "ملابس وأزياء", slug: "fashion", icon: "👗" }, { name: "إلكترونيات", slug: "electronics", icon: "📱" }, { name: "عطور", slug: "perfumes", icon: "🌸" }, { name: "تجميل", slug: "beauty", icon: "💄" }, { name: "أثاث", slug: "furniture", icon: "🛋️" }, { name: "أغذية", slug: "food", icon: "🍯" }, { name: "عام", slug: "general", icon: "🏬" },
  ]).returning();

  const themeDefs: [string, string, string, Partial<s.ThemeConfig>, boolean][] = [
    ["قالب الأزياء", "fashion", "fashion", { primary: "#be185d", secondary: "#111827", headerStyle: "centered" }, false],
    ["قالب الإلكترونيات", "electronics", "electronics", { primary: "#2563eb", secondary: "#0f172a", radius: "0.5rem" }, false],
    ["قالب العطور", "perfumes", "perfumes", { primary: "#7c3aed", secondary: "#c084fc", background: "#faf5ff" }, true],
    ["قالب التجميل", "beauty", "beauty", { primary: "#db2777", secondary: "#fbcfe8", background: "#fff1f2" }, true],
    ["قالب الأثاث", "furniture", "furniture", { primary: "#92400e", secondary: "#d97706", background: "#fffbeb" }, false],
    ["قالب الأغذية", "food", "food", { primary: "#16a34a", secondary: "#f59e0b" }, false],
    ["قالب عام", "general", "general", {}, false],
    ["قالب فاخر", "luxury", "luxury", { primary: "#111827", secondary: "#ca8a04", background: "#0b0b0b", text: "#f5f5f4", font: "Amiri" }, true],
    ["قالب عصري بسيط", "minimal", "minimal", { primary: "#0f172a", secondary: "#64748b", radius: "0px", headerStyle: "minimal" }, false],
  ];
  const themes = await db.insert(s.themes).values(themeDefs.map(([name, slug, category, cfg, paid]) => ({ name, slug, category, description: `قالب احترافي لمتاجر ${name.replace("قالب ", "")}`, isPaid: paid, price: paid ? "5000" : "0", minPlanId: paid ? plans[1].id : null, config: defaultThemeConfig(cfg) }))).returning();

  const providers = await db.insert(s.paymentProviders).values([
    { name: "بنك الكريمي", type: "bank" }, { name: "بنك التضامن", type: "bank" }, { name: "البنك الأهلي اليمني", type: "bank" }, { name: "بنك اليمن الدولي", type: "bank" }, { name: "بنك القطيبي", type: "bank" }, { name: "بنك سبأ الإسلامي", type: "bank" },
    { name: "محفظة جوالي (الكريمي)", type: "wallet" }, { name: "محفظة ون كاش", type: "wallet" }, { name: "محفظة كاش (يمن موبايل)", type: "wallet" }, { name: "محفظة موبايل موني", type: "wallet" }, { name: "محفظة فلوسك", type: "wallet" }, { name: "محفظة M-Floos", type: "wallet" },
    { name: "بوابة دفع إلكترونية (قيد التكامل)", type: "gateway", isActive: false, notes: "يتطلب تكاملاً رسمياً واختباراً قبل التفعيل" },
  ]).returning();

  await db.insert(s.platformSettings).values([{ key: "platform_name", value: "MS Commerce" }, { key: "auto_approve_stores", value: "false" }, { key: "default_commission", value: "5" }, { key: "default_currency", value: "YER" }, { key: "support_email", value: "support@mscommerce.com" }]);

  async function makeStore(owner: typeof m1, data: { name: string; slug: string; city: string; cat: number; theme: number; plan: number; desc: string; featured?: boolean; status?: string }, prods: { name: string; price: number; compare?: number; stock: number; cat: string; featured?: boolean; best?: boolean; img: string; brand?: string }[]) {
    const [st] = await db.insert(s.stores).values({ name: data.name, slug: data.slug, ownerId: owner.id, ownerName: owner.name, description: data.desc, city: data.city, email: owner.email, phone: owner.phone, categoryId: data.cat, status: data.status ?? "active", isFeatured: data.featured ?? false, themeId: data.theme, colors: { primary: themes.find((t) => t.id === data.theme)!.config.primary, secondary: themes.find((t) => t.id === data.theme)!.config.secondary }, socials: { whatsapp: owner.phone ?? "" } }).returning();
    await db.insert(s.storeMembers).values({ storeId: st.id, userId: owner.id, role: "owner" });
    await db.insert(s.subscriptions).values({ storeId: st.id, planId: data.plan, status: "active", amount: plans.find((p) => p.id === data.plan)!.priceMonthly, endsAt: new Date(Date.now() + 30 * 86400_000) });
    await db.insert(s.domains).values({ storeId: st.id, hostname: `${data.slug}.${HOST}`, type: "subdomain", isPrimary: true, status: "active", sslStatus: "issued", verificationToken: "seed" });
    const catNames = [...new Set(prods.map((p) => p.cat))];
    const catRows = await db.insert(s.categories).values(catNames.map((n, i) => ({ storeId: st.id, name: n, slug: `cat-${i}`, sortOrder: i }))).returning();
    await db.insert(s.products).values(prods.map((p, i) => ({ storeId: st.id, name: p.name, slug: `p-${i}-${data.slug}`, shortDescription: `${p.name} بجودة عالية`, description: `وصف تفصيلي لمنتج ${p.name}. منتج أصلي مع ضمان.`, price: String(p.price), comparePrice: p.compare ? String(p.compare) : null, sku: `${data.slug.toUpperCase()}-${100 + i}`, stock: p.stock, categoryId: catRows.find((c) => c.name === p.cat)!.id, brand: p.brand ?? null, images: [p.img], isFeatured: p.featured ?? false, isBestSeller: p.best ?? false, status: "published", salesCount: Math.floor(Math.random() * 40) })));
    await db.insert(s.pages).values({ storeId: st.id, name: "الصفحة الرئيسية", slug: "home", draft: baseSections(), published: baseSections(), publishedAt: new Date() });
    await db.insert(s.shippingMethods).values([{ storeId: st.id, name: "توصيل داخل المدينة", type: "city", price: "1500", rules: [{ city: data.city, price: "1000" }, { city: "عدن", price: "2500" }, { city: "تعز", price: "2000" }], eta: "1-3 أيام", carrier: "توصيل المتجر" }, { storeId: st.id, name: "الاستلام من المتجر", type: "pickup", price: "0", eta: "فوري" }]);
    await db.insert(s.storePaymentMethods).values([{ storeId: st.id, method: "bank_transfer", isEnabled: true, instructions: "حوّل المبلغ إلى الحساب ثم أدخل رقم العملية" }, { storeId: st.id, method: "wallet", isEnabled: true, instructions: "حوّل عبر المحفظة وأرفق صورة الإيصال" }, { storeId: st.id, method: "cod", isEnabled: true }, { storeId: st.id, method: "gateway", isEnabled: false }]);
    await db.insert(s.storePaymentAccounts).values([{ storeId: st.id, providerId: providers[0].id, accountName: owner.name, accountNumber: "3000" + st.id + "12345", currency: "YER", verificationStatus: "verified" }, { storeId: st.id, providerId: providers[6].id, accountName: owner.name, walletNumber: owner.phone ?? "", walletPhone: owner.phone ?? "", currency: "YER", verificationStatus: "verified" }]);
    return st;
  }
  const img = (q: string) => `https://images.unsplash.com/${q}?w=600&q=80&auto=format&fit=crop`;
  const s1 = await makeStore(m1, { name: "متجر الأناقة", slug: "elegance", city: "صنعاء", cat: cats[0].id, theme: themes[0].id, plan: plans[2].id, desc: "أزياء رجالية ونسائية عصرية بجودة عالية", featured: true }, [
    { name: "ثوب يمني تقليدي", price: 18000, compare: 22000, stock: 25, cat: "رجالي", featured: true, best: true, img: img("photo-1594938298603-c8148c4b4e0d"), brand: "الأناقة" },
    { name: "عباءة مطرزة", price: 25000, stock: 12, cat: "نسائي", featured: true, img: img("photo-1583391733956-6c78276477e2") },
    { name: "شماغ فاخر", price: 6000, compare: 7500, stock: 60, cat: "رجالي", best: true, img: img("photo-1601925260368-ae2f83cf8b7f") },
    { name: "حقيبة يد جلدية", price: 14000, stock: 8, cat: "إكسسوارات", featured: true, img: img("photo-1584917865442-de89df76afd3") },
    { name: "حذاء رياضي", price: 12000, compare: 15000, stock: 30, cat: "أحذية", img: img("photo-1542291026-7eec264c27ff") },
    { name: "ساعة كلاسيكية", price: 20000, stock: 3, cat: "إكسسوارات", best: true, img: img("photo-1524592094714-0f0654e20314") },
  ]);
  const s2 = await makeStore(m2, { name: "تك ستور", slug: "techstore", city: "عدن", cat: cats[1].id, theme: themes[1].id, plan: plans[1].id, desc: "أحدث الهواتف والإلكترونيات بأفضل الأسعار", featured: true }, [
    { name: "هاتف ذكي 128GB", price: 95000, compare: 105000, stock: 15, cat: "هواتف", featured: true, best: true, img: img("photo-1511707171634-5f897ff02aa9"), brand: "Samsung" },
    { name: "سماعات لاسلكية", price: 12000, stock: 40, cat: "صوتيات", featured: true, img: img("photo-1505740420928-5e560c06d30e") },
    { name: "شاحن سريع 65W", price: 4500, compare: 6000, stock: 100, cat: "إكسسوارات", best: true, img: img("photo-1583863788434-e58a36330cf0") },
    { name: "لابتوب 15 بوصة", price: 240000, stock: 5, cat: "حاسوب", featured: true, img: img("photo-1496181133206-80ce9b88a853"), brand: "Lenovo" },
    { name: "ساعة ذكية", price: 28000, stock: 20, cat: "إكسسوارات", img: img("photo-1546868871-7041f2a55e12") },
  ]);
  await makeStore(m2, { name: "عطور الياسمين", slug: "yasmin", city: "تعز", cat: cats[2].id, theme: themes[2].id, plan: plans[0].id, desc: "عطور شرقية وفرنسية أصلية", status: "pending" }, [
    { name: "عود كمبودي", price: 35000, stock: 10, cat: "عود", featured: true, img: img("photo-1541643600914-78b084683601") },
    { name: "عطر مسك أبيض", price: 9000, compare: 11000, stock: 30, cat: "عطور", best: true, img: img("photo-1594035910387-fea47794261f") },
  ]);
  await db.insert(s.storeMembers).values({ storeId: s1.id, userId: staff.id, role: "staff", permissions: { products: true, orders: true, customers: false, marketing: false, finance: false, design: false, settings: false } });

  // coupons & campaigns
  await db.insert(s.coupons).values([{ storeId: s1.id, code: "WELCOME10", type: "percent", value: "10", minOrder: "5000", maxUses: 100 }, { storeId: s2.id, code: "TECH5000", type: "fixed", value: "5000", minOrder: "50000" }]);
  const [camp] = await db.insert(s.campaigns).values([{ storeId: s1.id, title: "تخفيضات الموسم حتى 30%", description: "على جميع الملابس الرجالية", placement: "home_top", cost: "10000", link: "/s/elegance/products" }, { storeId: s2.id, title: "عرض الهواتف الذكية", description: "خصم مباشر على الهواتف", placement: "home_top", cost: "15000", link: "/s/techstore/products" }]).returning();
  const evs = [] as (typeof s.adEvents.$inferInsert)[];
  for (let i = 0; i < 120; i++) evs.push({ storeId: s1.id, campaignId: camp.id, type: i % 6 === 0 ? "click" : "view", visitorId: `v${i % 50}`, createdAt: new Date(Date.now() - Math.random() * 20 * 86400_000) });
  await db.insert(s.adEvents).values(evs);

  // orders for store 1
  const prods1 = await db.select().from(s.products).where(eq(s.products.storeId, s1.id));
  const [c1] = await db.insert(s.customers).values({ storeId: s1.id, userId: cust.id, name: cust.name, email: cust.email, phone: cust.phone, ordersCount: 3, totalSpent: "0" }).returning();
  const statuses = ["completed", "shipped", "new", "processing", "completed", "cancelled"];
  for (let i = 0; i < 6; i++) {
    const p = prods1[i % prods1.length];
    const qty = 1 + (i % 2);
    const total = Number(p.price) * qty + 1000;
    const paid = ["completed", "shipped", "processing"].includes(statuses[i]);
    const [o] = await db.insert(s.orders).values({ storeId: s1.id, orderNumber: `MS-${s1.id}-SEED${i + 1}`, customerId: c1.id, userId: cust.id, customerName: cust.name, phone: cust.phone!, city: "صنعاء", address: "شارع حدة", subtotal: String(Number(p.price) * qty), shippingFee: "1000", total: String(total), paymentMethod: i % 2 ? "wallet" : "bank_transfer", paymentStatus: paid ? "paid" : "unpaid", status: statuses[i], campaignId: i < 2 ? camp.id : null, createdAt: new Date(Date.now() - i * 3 * 86400_000) }).returning();
    await db.insert(s.orderItems).values({ orderId: o.id, storeId: s1.id, productId: p.id, name: p.name, price: p.price, quantity: qty, image: p.images[0] });
    await db.insert(s.orderEvents).values({ orderId: o.id, status: "new", note: "تم إنشاء الطلب" });
    if (paid) {
      await db.insert(s.payments).values({ storeId: s1.id, orderId: o.id, method: o.paymentMethod, amount: o.total, reference: `PAY-SEED-${i}`, transactionNumber: `TXN${1000 + i}`, status: "verified", verifiedBy: m1.id, verifiedAt: new Date() });
      const base = Number(p.price) * qty;
      await db.insert(s.commissions).values({ storeId: s1.id, orderId: o.id, orderTotal: String(base), rateType: "percent", rateValue: "5", amount: (base * 0.05).toFixed(2), status: i === 0 ? "settled" : "pending" });
      await db.update(s.customers).set({ totalSpent: sql`${s.customers.totalSpent} + ${o.total}` }).where(eq(s.customers.id, c1.id));
    }
  }
  await db.insert(s.notifications).values([{ userId: admin.id, type: "store_request", title: "طلب إنشاء متجر جديد: عطور الياسمين", link: "/admin/stores" }, { userId: m1.id, storeId: s1.id, type: "new_order", title: "لديك طلبات جديدة", link: "/dashboard/orders" }]);
  await db.insert(s.addresses).values({ userId: cust.id, label: "المنزل", city: "صنعاء", area: "حدة", street: "شارع الستين", phone: cust.phone, isDefault: true });
  console.log("Seed complete.\nSuper admin: admin@mscommerce.com / Admin@123\nMerchant: merchant@mscommerce.com / Merchant@123\nMerchant2: merchant2@mscommerce.com / Merchant@123\nStaff: staff@mscommerce.com / Staff@123\nCustomer: customer@mscommerce.com / Customer@123");
  void s2;
}
main().then(() => pool.end()).catch((e) => { console.error(e); pool.end(); process.exit(1); });
