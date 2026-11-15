import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Users & Auth ----------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("customer"), // super_admin | merchant | staff | customer
    locale: text("locale").notNull().default("ar"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

// ---------- Platform: plans, themes, categories, providers, settings ----------
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { precision: 12, scale: 2 }).notNull().default("0"),
  priceYearly: numeric("price_yearly", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("YER"),
  maxProducts: integer("max_products").notNull().default(50),
  maxStaff: integer("max_staff").notNull().default(1),
  maxThemes: integer("max_themes").notNull().default(1),
  storageMb: integer("storage_mb").notNull().default(500),
  allowCustomDomain: boolean("allow_custom_domain").notNull().default(false),
  allowMarketing: boolean("allow_marketing").notNull().default(false),
  allowReports: boolean("allow_reports").notNull().default(true),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).notNull().default("5"),
  durationDays: integer("duration_days").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const storeCategories = pgTable("store_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
});

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull().default("general"),
  description: text("description"),
  previewImage: text("preview_image"),
  isPaid: boolean("is_paid").notNull().default(false),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  minPlanId: integer("min_plan_id"),
  config: jsonb("config").$type<ThemeConfig>().notNull(),
  version: text("version").notNull().default("1.0.0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ThemeConfig = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  font: string;
  radius: string;
  headerStyle: "classic" | "centered" | "minimal";
  sections: PageSection[];
};

export type PageSection = {
  id: string;
  type:
    | "hero"
    | "banner"
    | "slider"
    | "text"
    | "image"
    | "video"
    | "button"
    | "products_featured"
    | "products_best"
    | "products_new"
    | "products_grid"
    | "categories"
    | "offers"
    | "ad";
  title?: string;
  subtitle?: string;
  content?: string;
  image?: string;
  images?: string[];
  video?: string;
  link?: string;
  buttonText?: string;
  background?: string;
  textColor?: string;
  fontSize?: "sm" | "md" | "lg" | "xl";
  padding?: "sm" | "md" | "lg";
  limit?: number;
  categoryId?: number | null;
  campaignId?: number | null;
  visible: boolean;
  showMobile: boolean;
  showDesktop: boolean;
};

export const paymentProviders = pgTable("payment_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("bank"), // bank | wallet | gateway
  logo: text("logo"),
  country: text("country").notNull().default("YE"),
  supportsApi: boolean("supports_api").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
});

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ---------- Stores (Tenants) ----------
export const stores = pgTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: integer("owner_id").notNull().references(() => users.id),
    ownerName: text("owner_name"),
    description: text("description"),
    logo: text("logo"),
    cover: text("cover"),
    banner: text("banner"),
    extraBanners: jsonb("extra_banners").$type<string[]>().notNull().default([]),
    categoryId: integer("category_id").references(() => storeCategories.id),
    colors: jsonb("colors").$type<{ primary: string; secondary: string }>().notNull().default({ primary: "#0f766e", secondary: "#f59e0b" }),
    email: text("email"),
    phone: text("phone"),
    socials: jsonb("socials").$type<Record<string, string>>().notNull().default({}),
    country: text("country").notNull().default("اليمن"),
    city: text("city"),
    currency: text("currency").notNull().default("YER"),
    status: text("status").notNull().default("pending"), // pending | active | suspended | rejected | expired
    isFeatured: boolean("is_featured").notNull().default(false),
    themeId: integer("theme_id").references(() => themes.id),
    themeOverrides: jsonb("theme_overrides").$type<Partial<ThemeConfig>>().notNull().default({}),
    previousThemeId: integer("previous_theme_id"),
    commissionType: text("commission_type"), // null => inherit plan | percent | fixed
    commissionValue: numeric("commission_value", { precision: 12, scale: 2 }),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("stores_slug_idx").on(t.slug), index("stores_owner_idx").on(t.ownerId), index("stores_status_idx").on(t.status)]
);

export type StaffPermissions = {
  products: boolean;
  orders: boolean;
  customers: boolean;
  marketing: boolean;
  finance: boolean;
  design: boolean;
  settings: boolean;
};

export const storeMembers = pgTable(
  "store_members",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("staff"), // owner | staff
    permissions: jsonb("permissions").$type<StaffPermissions>().notNull().default({ products: true, orders: true, customers: false, marketing: false, finance: false, design: false, settings: false }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("store_members_unique").on(t.storeId, t.userId)]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    planId: integer("plan_id").notNull().references(() => plans.id),
    status: text("status").notNull().default("active"), // active | expired | cancelled | pending_payment
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    startsAt: timestamp("starts_at").notNull().defaultNow(),
    endsAt: timestamp("ends_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("subscriptions_store_idx").on(t.storeId)]
);

export const domains = pgTable(
  "domains",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull(),
    type: text("type").notNull().default("subdomain"), // subdomain | custom
    isPrimary: boolean("is_primary").notNull().default(false),
    status: text("status").notNull().default("pending"), // pending | verifying | verified | active | failed
    verificationToken: text("verification_token").notNull(),
    sslStatus: text("ssl_status").notNull().default("none"), // none | pending | issued | failed
    dnsChecks: jsonb("dns_checks").$type<{ a?: boolean; cname?: boolean; txt?: boolean }>().notNull().default({}),
    lastCheckedAt: timestamp("last_checked_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("domains_hostname_idx").on(t.hostname), index("domains_store_idx").on(t.storeId)]
);

// ---------- Catalog ----------
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: integer("parent_id"),
    image: text("image"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("categories_store_idx").on(t.storeId), uniqueIndex("categories_store_slug").on(t.storeId, t.slug)]
);

export type ProductVariant = { id: string; name: string; options: Record<string, string>; price?: string; stock: number; sku?: string; image?: string };

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    comparePrice: numeric("compare_price", { precision: 12, scale: 2 }),
    sku: text("sku"),
    stock: integer("stock").notNull().default(0),
    weight: numeric("weight", { precision: 10, scale: 2 }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    brand: text("brand"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    video: text("video"),
    options: jsonb("options").$type<{ name: string; values: string[] }[]>().notNull().default([]),
    variants: jsonb("variants").$type<ProductVariant[]>().notNull().default([]),
    isFeatured: boolean("is_featured").notNull().default(false),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    status: text("status").notNull().default("draft"), // draft | published | archived
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    salesCount: integer("sales_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("products_store_idx").on(t.storeId), uniqueIndex("products_store_slug").on(t.storeId, t.slug), index("products_status_idx").on(t.storeId, t.status)]
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("reviews_product_idx").on(t.productId)]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("wishlist_unique").on(t.userId, t.productId)]
);

// ---------- Customers & Orders ----------
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    tag: text("tag").notNull().default("regular"), // regular | vip | blocked
    totalSpent: numeric("total_spent", { precision: 14, scale: 2 }).notNull().default("0"),
    ordersCount: integer("orders_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("customers_store_idx").on(t.storeId), index("customers_store_user").on(t.storeId, t.userId)]
);

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("المنزل"),
    city: text("city").notNull(),
    area: text("area"),
    street: text("street"),
    phone: text("phone"),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => [index("addresses_user_idx").on(t.userId)]
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(),
    checkoutGroupId: text("checkout_group_id"),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    city: text("city"),
    address: text("address"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
    shippingFee: numeric("shipping_fee", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("YER"),
    paymentMethod: text("payment_method").notNull(), // bank_transfer | wallet | cod | gateway
    paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | pending_review | paid | rejected | refunded
    status: text("status").notNull().default("new"), // new | confirming | processing | ready | shipped | completed | cancelled | returned
    shippingMethodId: integer("shipping_method_id"),
    shippingCarrier: text("shipping_carrier"),
    trackingNumber: text("tracking_number"),
    couponCode: text("coupon_code"),
    campaignId: integer("campaign_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("orders_store_idx").on(t.storeId), uniqueIndex("orders_number_idx").on(t.orderNumber), index("orders_user_idx").on(t.userId), index("orders_store_status").on(t.storeId, t.status)]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    storeId: integer("store_id").notNull(),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    variant: text("variant"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    image: text("image"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    byUserId: integer("by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)]
);

// ---------- Finance ----------
export const storePaymentAccounts = pgTable(
  "store_payment_accounts",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    providerId: integer("provider_id").notNull().references(() => paymentProviders.id),
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number"),
    iban: text("iban"),
    walletNumber: text("wallet_number"),
    walletPhone: text("wallet_phone"),
    currency: text("currency").notNull().default("YER"),
    proofUrl: text("proof_url"),
    verificationStatus: text("verification_status").notNull().default("pending"), // pending | verified | rejected
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("spa_store_idx").on(t.storeId)]
);

export const storePaymentMethods = pgTable(
  "store_payment_methods",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    method: text("method").notNull(), // bank_transfer | wallet | cod | gateway
    isEnabled: boolean("is_enabled").notNull().default(false),
    instructions: text("instructions"),
    feePercent: numeric("fee_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  },
  (t) => [uniqueIndex("spm_unique").on(t.storeId, t.method)]
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    accountId: integer("account_id"),
    method: text("method").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("YER"),
    reference: text("reference").notNull(),
    transactionNumber: text("transaction_number"),
    receiptUrl: text("receipt_url"),
    receiptHash: text("receipt_hash"),
    status: text("status").notNull().default("pending"), // pending | verified | rejected
    source: text("source").notNull().default("manual"), // manual | api | webhook
    verifiedBy: integer("verified_by"),
    verifiedAt: timestamp("verified_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("payments_store_idx").on(t.storeId), uniqueIndex("payments_reference_idx").on(t.reference), index("payments_txn_idx").on(t.storeId, t.transactionNumber)]
);

export const commissions = pgTable(
  "commissions",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    orderTotal: numeric("order_total", { precision: 14, scale: 2 }).notNull(),
    rateType: text("rate_type").notNull(), // percent | fixed
    rateValue: numeric("rate_value", { precision: 12, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: text("status").notNull().default("pending"), // pending | settled | voided
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("commissions_order_idx").on(t.orderId), index("commissions_store_idx").on(t.storeId)]
);

export const financeLogs = pgTable(
  "finance_logs",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id"),
    userId: integer("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: integer("entity_id"),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("finance_logs_store_idx").on(t.storeId)]
);

// ---------- Shipping ----------
export const shippingMethods = pgTable(
  "shipping_methods",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("flat"), // free | flat | city | weight | pickup
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    rules: jsonb("rules").$type<{ city?: string; area?: string; price: string; maxWeight?: number }[]>().notNull().default([]),
    eta: text("eta"),
    carrier: text("carrier"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("shipping_store_idx").on(t.storeId)]
);

// ---------- Marketing ----------
export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    type: text("type").notNull().default("percent"), // percent | fixed
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    minOrder: numeric("min_order", { precision: 12, scale: 2 }).notNull().default("0"),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at"),
    productIds: jsonb("product_ids").$type<number[]>().notNull().default([]),
    categoryIds: jsonb("category_ids").$type<number[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [uniqueIndex("coupons_store_code").on(t.storeId, t.code)]
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    image: text("image"),
    video: text("video"),
    link: text("link"),
    placement: text("placement").notNull().default("home_top"), // home_top | home_middle | sidebar | popup | product_page
    productId: integer("product_id"),
    categoryId: integer("category_id"),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("active"), // active | paused | ended
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("campaigns_store_idx").on(t.storeId)]
);

export const adEvents = pgTable(
  "ad_events",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull(),
    campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // view | click
    visitorId: text("visitor_id").notNull(),
    ipHash: text("ip_hash"),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ad_events_campaign_idx").on(t.campaignId, t.type), index("ad_events_visitor_idx").on(t.campaignId, t.visitorId, t.type)]
);

// ---------- Page builder ----------
export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().default("home"),
    draft: jsonb("draft").$type<PageSection[]>().notNull().default([]),
    published: jsonb("published").$type<PageSection[]>().notNull().default([]),
    publishedAt: timestamp("published_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pages_store_slug").on(t.storeId, t.slug)]
);

export const pageVersions = pgTable(
  "page_versions",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    content: jsonb("content").$type<PageSection[]>().notNull(),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("page_versions_page_idx").on(t.pageId)]
);

// ---------- Notifications & Audit ----------
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    storeId: integer("store_id"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead)]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    storeId: integer("store_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_store_idx").on(t.storeId), index("audit_user_idx").on(t.userId)]
);

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
