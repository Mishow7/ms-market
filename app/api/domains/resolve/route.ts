import { db } from "@/db";
import { domains, stores } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = (req.nextUrl.searchParams.get("host") || "").toLowerCase();
  if (!host) return Response.json({}, { status: 400 });
  const [d] = await db
    .select({ storeId: domains.storeId, isPrimary: domains.isPrimary, slug: stores.slug, status: stores.status })
    .from(domains)
    .innerJoin(stores, eq(stores.id, domains.storeId))
    .where(and(eq(domains.hostname, host), eq(domains.status, "active")))
    .limit(1);
  if (!d || d.status !== "active") return Response.json({}, { status: 404 });
  if (!d.isPrimary) {
    const [primary] = await db.select({ hostname: domains.hostname }).from(domains).where(and(eq(domains.storeId, d.storeId), eq(domains.isPrimary, true), eq(domains.status, "active"))).limit(1);
    if (primary && primary.hostname !== host) return Response.json({ redirectTo: primary.hostname });
  }
  return Response.json({ slug: d.slug });
}
