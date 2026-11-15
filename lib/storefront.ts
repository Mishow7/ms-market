import "server-only";
import { db } from "@/db";
import { campaigns, categories, domains, pages, products, stores, themes } from "@/db/schema";
import { and, desc, eq, lte, gte, or, isNull } from "drizzle-orm";
import { resolveTheme } from "./themes";
import { baseSections } from "./themes";
import type { PageSection } from "@/db/schema";
import { cache } from "react";

export const getStore = cache(async (slug: string) => {
  const [s] = await db.select().from(stores).where(eq(stores.slug, slug));
  return s ?? null;
});

export async function getStoreTheme(store: typeof stores.$inferSelect, previewThemeId?: number) {
  const id = previewThemeId || store.themeId;
  const [t] = id ? await db.select().from(themes).where(and(eq(themes.id, id), eq(themes.isActive, true))) : [];
  return { theme: resolveTheme(t?.config, previewThemeId ? {} : store.themeOverrides, store.colors), themeRow: t ?? null };
}

export async function getHomeSections(storeId: number, previewTheme?: typeof themes.$inferSelect | null): Promise<PageSection[]> {
  if (previewTheme) return previewTheme.config.sections;
  const [pg] = await db.select().from(pages).where(and(eq(pages.storeId, storeId), eq(pages.slug, "home")));
  return pg?.published.length ? pg.published : baseSections();
}

export async function getSectionData(storeId: number, sections: PageSection[]) {
  const base = and(eq(products.storeId, storeId), eq(products.status, "published"));
  const cols = { id: products.id, name: products.name, price: products.price, comparePrice: products.comparePrice, images: products.images, stock: products.stock };
  const need = new Set(sections.map((s) => s.type));
  const [featured, best, newest, cats, offers] = await Promise.all([
    need.has("products_featured") ? db.select(cols).from(products).where(and(base, eq(products.isFeatured, true))).orderBy(desc(products.id)).limit(12) : [],
    need.has("products_best") ? db.select(cols).from(products).where(base).orderBy(desc(products.isBestSeller), desc(products.salesCount)).limit(12) : [],
    need.has("products_new") ? db.select(cols).from(products).where(base).orderBy(desc(products.createdAt)).limit(12) : [],
    db.select({ id: categories.id, name: categories.name, image: categories.image }).from(categories).where(eq(categories.storeId, storeId)).orderBy(categories.sortOrder),
    need.has("offers") ? db.select(cols).from(products).where(base).orderBy(desc(products.id)).limit(40) : [],
  ]);
  const grids: Record<string, typeof featured> = {};
  for (const s of sections.filter((x) => x.type === "products_grid")) {
    grids[s.id] = await db.select(cols).from(products).where(s.categoryId ? and(base, eq(products.categoryId, s.categoryId)) : base).orderBy(desc(products.id)).limit(s.limit ?? 8);
  }
  return { featured, best, newest, cats, offers, grids };
}

export async function getActiveCampaigns(storeId: number, placement?: string) {
  const now = new Date();
  const conds = [eq(campaigns.storeId, storeId), eq(campaigns.status, "active"), or(isNull(campaigns.startsAt), lte(campaigns.startsAt, now)), or(isNull(campaigns.endsAt), gte(campaigns.endsAt, now))];
  if (placement) conds.push(eq(campaigns.placement, placement));
  return db.select().from(campaigns).where(and(...conds)).orderBy(desc(campaigns.id)).limit(5);
}

export async function getPrimaryDomain(storeId: number) {
  const [d] = await db.select().from(domains).where(and(eq(domains.storeId, storeId), eq(domains.isPrimary, true), eq(domains.status, "active")));
  return d ?? null;
}
