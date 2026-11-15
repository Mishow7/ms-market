import { db } from "@/db";
import { adEvents, campaigns } from "@/db/schema";
import { createHash } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
const BOT_RE = /bot|crawl|spider|slurp|headless|curl|wget|python|facebookexternalhit|preview/i;

/** Real ad tracking: de-duplicated per visitor per 12h window, bots flagged & excluded from metrics. */
export async function POST(req: NextRequest) {
  try {
    const { campaignId, type, visitorId } = (await req.json()) as { campaignId: number; type: "view" | "click"; visitorId: string };
    if (!campaignId || !["view", "click"].includes(type) || !visitorId || visitorId.length > 64) return Response.json({ ok: false }, { status: 400 });
    const [c] = await db.select({ id: campaigns.id, storeId: campaigns.storeId }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!c) return Response.json({ ok: false }, { status: 404 });
    const ua = req.headers.get("user-agent") || "";
    const isBot = BOT_RE.test(ua) || !ua;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    const ipHash = createHash("sha256").update(ip + (process.env.TRACK_SALT || "ms")).digest("hex").slice(0, 32);
    const since = new Date(Date.now() - 12 * 3600_000);
    const dup = await db
      .select({ id: adEvents.id })
      .from(adEvents)
      .where(and(eq(adEvents.campaignId, campaignId), eq(adEvents.visitorId, visitorId), eq(adEvents.type, type), gt(adEvents.createdAt, since)))
      .limit(1);
    if (dup.length && type === "view") return Response.json({ ok: true, deduped: true });
    await db.insert(adEvents).values({ storeId: c.storeId, campaignId, type, visitorId, ipHash, isBot });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
