import { db } from "@/db";
import { campaigns, categories, pageVersions, pages, themes } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { PageBuilder } from "@/components/dashboard/PageBuilder";
import { baseSections } from "@/lib/themes";
export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const { store } = await requireStore("design");
  let [pg] = await db.select().from(pages).where(and(eq(pages.storeId, store.id), eq(pages.slug, "home")));
  if (!pg) {
    const [t] = store.themeId ? await db.select().from(themes).where(eq(themes.id, store.themeId)) : [];
    const sections = t?.config.sections ?? baseSections();
    [pg] = await db.insert(pages).values({ storeId: store.id, name: "الصفحة الرئيسية", slug: "home", draft: sections, published: sections, publishedAt: new Date() }).returning();
  }
  const [versions, cats, camps] = await Promise.all([
    db.select().from(pageVersions).where(eq(pageVersions.pageId, pg.id)).orderBy(desc(pageVersions.id)).limit(10),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.storeId, store.id)),
    db.select({ id: campaigns.id, title: campaigns.title }).from(campaigns).where(eq(campaigns.storeId, store.id)),
  ]);
  return <PageBuilder initial={pg.draft.length ? pg.draft : pg.published} versions={versions.map((v) => ({ id: v.id, label: v.label ?? "", createdAt: v.createdAt.toISOString() }))} categories={cats} campaigns={camps} storeSlug={store.slug} publishedAt={pg.publishedAt?.toISOString() ?? null} />;
}
