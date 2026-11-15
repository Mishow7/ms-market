import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/dashboard/ProductForm";
export const dynamic = "force-dynamic";
export default async function NewProduct() {
  const { store } = await requireStore("products");
  const cats = await db.select().from(categories).where(eq(categories.storeId, store.id));
  return <div><PageHeader title="إضافة منتج" /><ProductForm categories={cats} currency={store.currency} /></div>;
}
