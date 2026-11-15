import type { PageSection, ThemeConfig } from "@/db/schema";

export const THEME_CATEGORIES: Record<string, string> = { fashion: "الملابس والأزياء", electronics: "الإلكترونيات", perfumes: "العطور", beauty: "مستحضرات التجميل", furniture: "الأثاث", food: "الأغذية", general: "المنتجات العامة", luxury: "فاخر", minimal: "عصري بسيط" };

export const uid = () => Math.random().toString(36).slice(2, 10);

export function baseSections(): PageSection[] {
  const s = (p: Partial<PageSection> & { type: PageSection["type"] }): PageSection => ({ id: uid(), visible: true, showMobile: true, showDesktop: true, padding: "md", ...p });
  return [
    s({ type: "hero", title: "مرحباً بك في متجرنا", subtitle: "أفضل المنتجات بأسعار منافسة وتوصيل سريع", buttonText: "تسوق الآن", link: "#products" }),
    s({ type: "categories", title: "تسوق حسب التصنيف", limit: 8 }),
    s({ type: "products_featured", title: "منتجات مميزة", limit: 8 }),
    s({ type: "banner", title: "عروض خاصة", subtitle: "خصومات حتى 30%", buttonText: "اكتشف العروض", background: "#0f172a", textColor: "#ffffff" }),
    s({ type: "products_best", title: "الأكثر مبيعاً", limit: 8 }),
    s({ type: "products_new", title: "وصل حديثاً", limit: 8 }),
  ];
}

export function defaultThemeConfig(partial: Partial<ThemeConfig> = {}): ThemeConfig {
  return { primary: "#0f766e", secondary: "#f59e0b", accent: "#0ea5e9", background: "#ffffff", text: "#0f172a", font: "Tajawal", radius: "1rem", headerStyle: "classic", sections: baseSections(), ...partial };
}

export function resolveTheme(theme: ThemeConfig | null | undefined, overrides: Partial<ThemeConfig>, colors: { primary: string; secondary: string }): ThemeConfig {
  const base = theme ?? defaultThemeConfig({ primary: colors.primary, secondary: colors.secondary });
  const clean = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  return { ...base, ...clean } as ThemeConfig;
}
