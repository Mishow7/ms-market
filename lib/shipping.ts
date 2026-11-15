import type { shippingMethods } from "@/db/schema";

export function computeShipping(m: typeof shippingMethods.$inferSelect | undefined, city: string, weight: number) {
  if (!m) return 0;
  if (m.type === "free" || m.type === "pickup") return 0;
  if (m.type === "flat") return Number(m.price);
  if (m.type === "city") {
    const r = m.rules.find((x) => x.city && city.includes(x.city));
    return r ? Number(r.price) : Number(m.price);
  }
  if (m.type === "weight") {
    const r = m.rules.filter((x) => x.maxWeight != null).sort((a, b) => (a.maxWeight ?? 0) - (b.maxWeight ?? 0)).find((x) => weight <= (x.maxWeight ?? 0));
    return r ? Number(r.price) : Number(m.price);
  }
  return Number(m.price);
}

