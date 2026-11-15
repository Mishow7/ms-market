import Link from "next/link";
import type { stores } from "@/db/schema";

export function StoreCard({ store, compact }: { store: typeof stores.$inferSelect; compact?: boolean }) {
  return (
    <Link href={`/stores/${store.slug}`} className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative ${compact ? "h-28" : "h-40"} bg-gradient-to-br`} style={{ background: store.cover ? `url(${store.cover}) center/cover` : `linear-gradient(135deg, ${store.colors.primary}, ${store.colors.secondary})` }}>
        <div className="absolute -bottom-6 end-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-xl font-black shadow" style={{ color: store.colors.primary }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {store.logo ? <img src={store.logo} alt={store.name} className="h-full w-full object-cover" /> : store.name.slice(0, 1)}
        </div>
      </div>
      <div className="p-4 pt-8">
        <h3 className="font-bold text-slate-900 group-hover:text-teal-700">{store.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{store.description || "متجر إلكتروني على منصة MS Commerce"}</p>
        <p className="mt-2 text-xs text-slate-400">📍 {store.city || store.country}</p>
      </div>
    </Link>
  );
}
