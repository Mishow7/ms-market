import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireStore } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/dashboard/ProductForm";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireStore("products");
  const id = Number((await params).id);
  const [[p], cats] = await Promise.all([db.select().from(products).where(and(eq(products.id, id), eq(products.storeId, store.id))), db.select().from(categories).where(eq(categories.storeId, store.id))]);
  if (!p) notFound();
  return <div><PageHeader title={`تعديل: ${p.name}`} /><ProductForm product={p} categories={cats} currency={store.currency} /></div>;
}
