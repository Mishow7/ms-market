import Link from "next/link";
import type { PageSection } from "@/db/schema";
import { money } from "@/lib/utils";
import { AdTracker } from "./AdTracker";

export type SFProduct = { id: number; name: string; price: string; comparePrice: string | null; images: string[]; stock: number };
export type SFCategory = { id: number; name: string; image: string | null };

const pad = { sm: "py-4", md: "py-8", lg: "py-16" };
const fs = { sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-5xl" };

export function ProductCard({ p, primary, currency, storeSlug }: { p: SFProduct; primary: string; currency: string; storeSlug: string }) {
  const off = p.comparePrice && Number(p.comparePrice) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.comparePrice)) * 100) : 0;
  return (
    <Link href={`/s/${storeSlug}/p/${p.id}`} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.images[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-4xl text-slate-300">🛍️</div>}
        {off > 0 && <span className="absolute top-2 start-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>}
        {p.stock <= 0 && <span className="absolute inset-0 flex items-center justify-center bg-white/70 font-bold text-slate-700">نفدت الكمية</span>}
      </div>
      <div className="p-3"><p className="truncate text-sm font-bold text-slate-800">{p.name}</p><div className="mt-1 flex items-center gap-2"><span className="font-black" style={{ color: primary }}>{money(p.price, currency)}</span>{off > 0 && <span className="text-xs text-slate-400 line-through">{money(p.comparePrice, currency)}</span>}</div></div>
    </Link>
  );
}

export function SectionRenderer({ section: s, products, categories, primary, secondary, currency, storeSlug, preview }: { section: PageSection; products: SFProduct[]; categories: SFCategory[]; primary: string; secondary: string; currency: string; storeSlug: string; preview?: boolean }) {
  if (!s.visible && !preview) return null;
  const vis = `${s.showMobile ? "" : "hidden md:block"} ${s.showDesktop ? "" : "md:hidden"}`;
  const style = { background: s.background || undefined, color: s.textColor || undefined };
  const wrap = (children: React.ReactNode) => <section className={`${pad[s.padding ?? "md"]} ${vis}`} style={style}><div className="mx-auto max-w-7xl px-4">{children}</div></section>;
  const list = products.slice(0, s.limit ?? 8);
  const grid = (title?: string) => wrap(<><h2 className={`mb-5 font-black ${fs[s.fontSize ?? "md"]}`}>{title}</h2>{list.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-400">{preview ? "ستظهر منتجاتك هنا" : "لا توجد منتجات حالياً"}</div> : <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} primary={primary} currency={currency} storeSlug={storeSlug} />)}</div>}</>);
  switch (s.type) {
    case "hero":
      return (
        <section className={`relative overflow-hidden ${vis}`} style={{ background: s.background || `linear-gradient(135deg, ${primary}, ${secondary})`, color: s.textColor || "#fff" }}>
          {s.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <div className={`relative mx-auto max-w-7xl px-4 ${s.padding === "lg" ? "py-32" : s.padding === "sm" ? "py-12" : "py-24"} text-center`}>
            <h1 className={`font-black ${s.fontSize === "xl" ? "text-6xl" : s.fontSize === "lg" ? "text-5xl" : s.fontSize === "sm" ? "text-2xl" : "text-4xl"}`}>{s.title}</h1>
            {s.subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{s.subtitle}</p>}
            {s.buttonText && <Link href={s.link || `/s/${storeSlug}/products`} className="mt-8 inline-block rounded-2xl bg-white px-8 py-3 font-bold shadow-lg" style={{ color: primary }}>{s.buttonText}</Link>}
          </div>
        </section>
      );
    case "banner":
    case "ad":
      return wrap(
        <div className="relative overflow-hidden rounded-3xl" style={{ background: s.background || secondary, color: s.textColor || "#fff" }}>
          {s.campaignId && !preview && <AdTracker campaignId={s.campaignId} />}
          {s.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className={`relative flex flex-col items-start justify-between gap-4 p-8 md:flex-row md:items-center ${s.image ? "bg-black/40" : ""}`}>
            <div><h3 className={`font-black ${fs[s.fontSize ?? "md"]}`}>{s.title}</h3>{s.subtitle && <p className="mt-1 opacity-90">{s.subtitle}</p>}</div>
            {s.buttonText && <Link href={s.link || "#"} data-campaign={s.campaignId ?? undefined} className="rounded-xl bg-white px-6 py-2.5 font-bold text-slate-900">{s.buttonText}</Link>}
          </div>
        </div>
      );
    case "slider":
      return wrap(<div className="flex snap-x gap-4 overflow-x-auto scrollbar-thin">{(s.images?.length ? s.images : preview ? ["", ""] : []).map((img, i) => <div key={i} className="h-56 min-w-[80%] snap-center overflow-hidden rounded-3xl bg-slate-200 md:h-80 md:min-w-[60%]">{img && /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="" className="h-full w-full object-cover" />}</div>)}</div>);
    case "text":
      return wrap(<div className="mx-auto max-w-3xl text-center"><h2 className={`font-black ${fs[s.fontSize ?? "md"]}`}>{s.title}</h2>{s.subtitle && <p className="mt-2 text-slate-500">{s.subtitle}</p>}{s.content && <p className="mt-4 whitespace-pre-line leading-8">{s.content}</p>}</div>);
    case "image":
      return wrap(<div className="overflow-hidden rounded-3xl">{s.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.image} alt={s.title ?? ""} className="w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">صورة</div>}</div>);
    case "video":
      return wrap(<div className="aspect-video overflow-hidden rounded-3xl bg-black">{s.video ? (s.video.includes("youtu") ? <iframe className="h-full w-full" src={s.video.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")} allowFullScreen /> : <video src={s.video} controls className="h-full w-full" />) : <div className="flex h-full items-center justify-center text-white/60">فيديو</div>}</div>);
    case "button":
      return wrap(<div className="text-center"><Link href={s.link || "#"} className="inline-block rounded-2xl px-8 py-3 font-bold text-white" style={{ background: primary }}>{s.buttonText || s.title || "اضغط هنا"}</Link></div>);
    case "categories":
      return wrap(<><h2 className={`mb-5 font-black ${fs[s.fontSize ?? "md"]}`}>{s.title}</h2><div className="flex flex-wrap gap-3">{categories.slice(0, s.limit ?? 8).map((c) => <Link key={c.id} href={`/s/${storeSlug}/products?category=${c.id}`} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold shadow-sm hover:shadow">{c.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" className="h-8 w-8 rounded-lg object-cover" />}{c.name}</Link>)}{categories.length === 0 && <p className="text-sm text-slate-400">لا توجد تصنيفات</p>}</div></>);
    case "offers":
      return wrap(<><h2 className={`mb-5 font-black ${fs[s.fontSize ?? "md"]}`}>{s.title}</h2>{s.subtitle && <p className="-mt-3 mb-5 text-slate-500">{s.subtitle}</p>}<div className="grid grid-cols-2 gap-4 md:grid-cols-4">{products.filter((p) => p.comparePrice && Number(p.comparePrice) > Number(p.price)).slice(0, s.limit ?? 8).map((p) => <ProductCard key={p.id} p={p} primary={primary} currency={currency} storeSlug={storeSlug} />)}</div></>);
    case "products_featured":
    case "products_best":
    case "products_new":
    case "products_grid":
      return grid(s.title);
    default:
      return null;
  }
}
