import { db } from "@/db";
import { products, stores, wishlists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { ProductCard } from "@/components/storefront/SectionRenderer";
export const dynamic = "force-dynamic";
export default async function Wishlist() {
  const user = await requireUser();
  const rows = await db.select({ p: products, slug: stores.slug, currency: stores.currency, colors: stores.colors }).from(wishlists).innerJoin(products, eq(products.id, wishlists.productId)).innerJoin(stores, eq(stores.id, products.storeId)).where(eq(wishlists.userId, user.id));
  return <div><PageHeader title="المفضلة" />{rows.length === 0 ? <EmptyState icon="❤️" title="لا توجد منتجات في المفضلة" /> : <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{rows.map((r) => <ProductCard key={r.p.id} p={r.p} primary={r.colors.primary} currency={r.currency} storeSlug={r.slug} />)}</div>}</div>;
}
