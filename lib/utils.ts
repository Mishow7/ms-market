export function slugify(input: string) {
  const s = input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || `item-${Date.now().toString(36)}`;
}

export function randomToken(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export const CURRENCIES: Record<string, { label: string; symbol: string }> = {
  YER: { label: "ريال يمني", symbol: "ر.ي" },
  SAR: { label: "ريال سعودي", symbol: "ر.س" },
  USD: { label: "دولار أمريكي", symbol: "$" },
};

export function money(value: string | number | null | undefined, currency = "YER") {
  const n = Number(value ?? 0);
  const c = CURRENCIES[currency] ?? { symbol: currency };
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${c.symbol}`;
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}
export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function orderNumber(storeId: number) {
  const t = Date.now().toString(36).toUpperCase();
  return `MS-${storeId}-${t}-${Math.floor(Math.random() * 900 + 100)}`;
}

export const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-blue-100 text-blue-700" },
  confirming: { label: "قيد التأكيد", color: "bg-amber-100 text-amber-700" },
  processing: { label: "قيد التجهيز", color: "bg-indigo-100 text-indigo-700" },
  ready: { label: "جاهز للشحن", color: "bg-purple-100 text-purple-700" },
  shipped: { label: "تم الشحن", color: "bg-cyan-100 text-cyan-700" },
  completed: { label: "مكتمل", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغي", color: "bg-rose-100 text-rose-700" },
  returned: { label: "مسترجع", color: "bg-slate-200 text-slate-700" },
};
export const PAYMENT_STATUSES: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مدفوع", color: "bg-slate-100 text-slate-700" },
  pending_review: { label: "بانتظار التحقق", color: "bg-amber-100 text-amber-700" },
  paid: { label: "مدفوع", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "مرفوض", color: "bg-rose-100 text-rose-700" },
  refunded: { label: "مسترد", color: "bg-slate-200 text-slate-700" },
};
export const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  wallet: "محفظة إلكترونية",
  cod: "الدفع عند الاستلام",
  gateway: "بوابة دفع إلكترونية",
};
export const STORE_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-700" },
  active: { label: "نشط", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "متوقف", color: "bg-rose-100 text-rose-700" },
  rejected: { label: "مرفوض", color: "bg-slate-200 text-slate-700" },
  expired: { label: "منتهي الاشتراك", color: "bg-orange-100 text-orange-700" },
};
export const DOMAIN_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار الإعداد", color: "bg-slate-100 text-slate-700" },
  verifying: { label: "قيد التحقق", color: "bg-amber-100 text-amber-700" },
  verified: { label: "تم التحقق", color: "bg-blue-100 text-blue-700" },
  active: { label: "نشط", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "فشل", color: "bg-rose-100 text-rose-700" },
};

export function platformHost() {
  return process.env.PLATFORM_HOST || "localhost:3000";
}
export function storeUrl(slug: string) {
  return `/s/${slug}`;
}
export function n(v: string | number | null | undefined) {
  return Number(v ?? 0);
}
