"use client";
import { useState, useTransition } from "react";
import type { PageSection } from "@/db/schema";
import { publishPageAction, restorePageVersionAction, savePageDraftAction } from "@/actions/store";
import { Button, cn } from "@/components/ui";
import { ImageUploader } from "@/components/ui/client";
import { SectionRenderer } from "@/components/storefront/SectionRenderer";

const TYPES: { type: PageSection["type"]; label: string; icon: string }[] = [
  { type: "hero", label: "بنر رئيسي", icon: "🖼️" }, { type: "banner", label: "بنر إعلاني", icon: "📢" }, { type: "slider", label: "شرائح صور", icon: "🎞️" }, { type: "text", label: "نص", icon: "📝" }, { type: "image", label: "صورة", icon: "🏞️" }, { type: "video", label: "فيديو", icon: "🎬" }, { type: "button", label: "زر", icon: "🔘" }, { type: "categories", label: "التصنيفات", icon: "🗂️" }, { type: "products_featured", label: "منتجات مميزة", icon: "⭐" }, { type: "products_best", label: "الأكثر مبيعاً", icon: "🔥" }, { type: "products_new", label: "وصل حديثاً", icon: "🆕" }, { type: "products_grid", label: "منتجات تصنيف", icon: "📦" }, { type: "offers", label: "العروض والخصومات", icon: "🏷️" }, { type: "ad", label: "إعلان تسويقي", icon: "📣" },
];
const uid = () => Math.random().toString(36).slice(2, 10);

export function PageBuilder({ initial, versions, categories, campaigns, storeSlug, publishedAt }: { initial: PageSection[]; versions: { id: number; label: string; createdAt: string }[]; categories: { id: number; name: string }[]; campaigns: { id: number; title: string }[]; storeSlug: string; publishedAt: string | null }) {
  const [sections, setSections] = useState<PageSection[]>(initial);
  const [history, setHistory] = useState<PageSection[][]>([]);
  const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [drag, setDrag] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const push = (next: PageSection[]) => { setHistory((h) => [...h.slice(-30), sections]); setSections(next); };
  const undo = () => { const prev = history[history.length - 1]; if (!prev) return; setHistory((h) => h.slice(0, -1)); setSections(prev); };
  const add = (type: PageSection["type"]) => { const s: PageSection = { id: uid(), type, title: TYPES.find((t) => t.type === type)?.label, visible: true, showMobile: true, showDesktop: true, padding: "md", limit: 8 }; push([...sections, s]); setSel(s.id); };
  const update = (id: string, patch: Partial<PageSection>) => push(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (from: number, to: number) => { if (to < 0 || to >= sections.length) return; const n = [...sections]; const [x] = n.splice(from, 1); n.splice(to, 0, x); push(n); };
  const cur = sections.find((s) => s.id === sel);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2"><h1 className="font-extrabold">🧩 منشئ الصفحة الرئيسية</h1>{publishedAt && <span className="text-xs text-slate-400">آخر نشر: {new Date(publishedAt).toLocaleString("ar-EG")}</span>}{msg && <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{msg}</span>}</div>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDevice("desktop")} className={device === "desktop" ? "bg-slate-100" : ""}>🖥 كمبيوتر</Button><Button size="sm" variant="ghost" onClick={() => setDevice("mobile")} className={device === "mobile" ? "bg-slate-100" : ""}>📱 جوال</Button>
          <Button size="sm" variant="outline" onClick={undo} disabled={!history.length}>↶ تراجع</Button>
          <Button size="sm" variant="outline" href={`/s/${storeSlug}`}>👁 المتجر</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { await savePageDraftAction(sections); flash("تم حفظ المسودة"); })}>💾 حفظ مسودة</Button>
          <Button size="sm" disabled={pending} onClick={() => start(async () => { await publishPageAction(sections); flash("تم النشر بنجاح"); })}>🚀 نشر</Button>
        </div>
      </div>
      <div className="grid flex-1 gap-3 overflow-hidden lg:grid-cols-12">
        <aside className="space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 lg:col-span-2 scrollbar-thin">
          <p className="text-xs font-bold text-slate-500">اسحب أو اضغط لإضافة قسم</p>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">{TYPES.map((t) => <button key={t.type} draggable onDragStart={(e) => e.dataTransfer.setData("newType", t.type)} onClick={() => add(t.type)} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-2 py-2 text-xs hover:border-teal-500 hover:bg-teal-50"><span>{t.icon}</span>{t.label}</button>)}</div>
          {versions.length > 0 && <div><p className="mt-4 text-xs font-bold text-slate-500">سجل الإصدارات</p><ul className="mt-1 space-y-1">{versions.map((v) => <li key={v.id}><button onClick={() => start(async () => { await restorePageVersionAction(v.id); location.reload(); })} className="w-full truncate rounded-lg px-2 py-1 text-start text-xs hover:bg-slate-100" title={v.label}>↩ {new Date(v.createdAt).toLocaleString("ar-EG")}</button></li>)}</ul></div>}
        </aside>
        <section className="overflow-y-auto rounded-2xl border border-slate-200 bg-slate-100 p-3 lg:col-span-7 scrollbar-thin" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const t = e.dataTransfer.getData("newType") as PageSection["type"]; if (t) add(t); }}>
          <div className={cn("mx-auto space-y-2 transition-all", device === "mobile" ? "max-w-[390px]" : "max-w-full")}>
            {sections.length === 0 && <div className="rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center text-slate-400">اسحب الأقسام هنا لبناء صفحتك</div>}
            {sections.map((s, i) => {
              const hiddenOnDevice = device === "mobile" ? !s.showMobile : !s.showDesktop;
              return (
                <div key={s.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); const t = e.dataTransfer.getData("newType"); if (t) { const ns: PageSection = { id: uid(), type: t as PageSection["type"], title: TYPES.find((x) => x.type === t)?.label, visible: true, showMobile: true, showDesktop: true, padding: "md", limit: 8 }; const n = [...sections]; n.splice(i, 0, ns); push(n); } else if (drag !== null) move(drag, i); setDrag(null); }} onClick={() => setSel(s.id)}
                  className={cn("group relative cursor-pointer overflow-hidden rounded-xl border-2 bg-white transition", sel === s.id ? "border-teal-500 shadow-lg" : "border-transparent hover:border-slate-300", (!s.visible || hiddenOnDevice) && "opacity-40")}>
                  <div className="absolute top-1 end-1 z-10 hidden gap-1 group-hover:flex"><button onClick={(e) => { e.stopPropagation(); move(i, i - 1); }} className="rounded bg-white/90 px-2 py-0.5 text-xs shadow">↑</button><button onClick={(e) => { e.stopPropagation(); move(i, i + 1); }} className="rounded bg-white/90 px-2 py-0.5 text-xs shadow">↓</button><button onClick={(e) => { e.stopPropagation(); update(s.id, { visible: !s.visible }); }} className="rounded bg-white/90 px-2 py-0.5 text-xs shadow">{s.visible ? "👁" : "🚫"}</button><button onClick={(e) => { e.stopPropagation(); push([...sections.slice(0, i + 1), { ...s, id: uid() }, ...sections.slice(i + 1)]); }} className="rounded bg-white/90 px-2 py-0.5 text-xs shadow">⧉</button><button onClick={(e) => { e.stopPropagation(); if (confirm("حذف القسم؟")) push(sections.filter((x) => x.id !== s.id)); }} className="rounded bg-rose-600 px-2 py-0.5 text-xs text-white shadow">✕</button></div>
                  <div className="absolute top-1 start-1 z-10 rounded bg-slate-900/70 px-2 py-0.5 text-[10px] text-white">{TYPES.find((t) => t.type === s.type)?.icon} {TYPES.find((t) => t.type === s.type)?.label}</div>
                  <div className="pointer-events-none"><SectionRenderer section={s} preview primary="#0f766e" secondary="#f59e0b" currency="YER" storeSlug={storeSlug} products={[]} categories={categories.map((c) => ({ id: c.id, name: c.name, image: null }))} /></div>
                </div>
              );
            })}
          </div>
        </section>
        <aside className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-3 scrollbar-thin">
          {!cur ? <p className="text-sm text-slate-400">اختر قسماً لتعديل خصائصه</p> : (
            <div className="space-y-3 text-sm">
              <p className="font-bold">خصائص: {TYPES.find((t) => t.type === cur.type)?.label}</p>
              <F label="العنوان"><input value={cur.title ?? ""} onChange={(e) => update(cur.id, { title: e.target.value })} className={inp} /></F>
              {["hero", "banner", "text", "ad", "offers"].includes(cur.type) && <F label="العنوان الفرعي / النص"><textarea value={cur.subtitle ?? ""} onChange={(e) => update(cur.id, { subtitle: e.target.value })} className={inp} rows={3} /></F>}
              {cur.type === "text" && <F label="المحتوى"><textarea value={cur.content ?? ""} onChange={(e) => update(cur.id, { content: e.target.value })} className={inp} rows={5} /></F>}
              {["hero", "banner", "image", "ad"].includes(cur.type) && <ImageUploader key={cur.id + "img"} name="_img" label="الصورة" defaultValue={cur.image} />}
              {["hero", "banner", "image", "ad"].includes(cur.type) && <F label="رابط الصورة"><input value={cur.image ?? ""} onChange={(e) => update(cur.id, { image: e.target.value })} className={inp} placeholder="الصق رابط الصورة بعد الرفع" /></F>}
              {cur.type === "slider" && <F label="روابط الصور (سطر لكل صورة)"><textarea value={(cur.images ?? []).join("\n")} onChange={(e) => update(cur.id, { images: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className={inp} rows={4} /></F>}
              {cur.type === "video" && <F label="رابط الفيديو (YouTube/mp4)"><input value={cur.video ?? ""} onChange={(e) => update(cur.id, { video: e.target.value })} className={inp} /></F>}
              {["hero", "banner", "button", "image", "ad", "offers"].includes(cur.type) && <><F label="نص الزر"><input value={cur.buttonText ?? ""} onChange={(e) => update(cur.id, { buttonText: e.target.value })} className={inp} /></F><F label="الرابط"><input value={cur.link ?? ""} onChange={(e) => update(cur.id, { link: e.target.value })} className={inp} /></F></>}
              {cur.type.startsWith("products") || cur.type === "categories" || cur.type === "offers" ? <F label="عدد العناصر"><input type="number" value={cur.limit ?? 8} onChange={(e) => update(cur.id, { limit: Number(e.target.value) })} className={inp} /></F> : null}
              {cur.type === "products_grid" && <F label="التصنيف"><select value={cur.categoryId ?? ""} onChange={(e) => update(cur.id, { categoryId: Number(e.target.value) || null })} className={inp}><option value="">كل المنتجات</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>}
              {cur.type === "ad" && <F label="الحملة الإعلانية (للتتبع)"><select value={cur.campaignId ?? ""} onChange={(e) => update(cur.id, { campaignId: Number(e.target.value) || null })} className={inp}><option value="">بدون</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></F>}
              <div className="grid grid-cols-2 gap-2"><F label="الخلفية"><input type="color" value={cur.background ?? "#ffffff"} onChange={(e) => update(cur.id, { background: e.target.value })} /></F><F label="لون النص"><input type="color" value={cur.textColor ?? "#0f172a"} onChange={(e) => update(cur.id, { textColor: e.target.value })} /></F></div>
              <div className="grid grid-cols-2 gap-2"><F label="حجم الخط"><select value={cur.fontSize ?? "md"} onChange={(e) => update(cur.id, { fontSize: e.target.value as PageSection["fontSize"] })} className={inp}><option value="sm">صغير</option><option value="md">متوسط</option><option value="lg">كبير</option><option value="xl">ضخم</option></select></F><F label="المسافات"><select value={cur.padding ?? "md"} onChange={(e) => update(cur.id, { padding: e.target.value as PageSection["padding"] })} className={inp}><option value="sm">ضيقة</option><option value="md">متوسطة</option><option value="lg">واسعة</option></select></F></div>
              <div className="space-y-1 rounded-xl bg-slate-50 p-2"><label className="flex items-center gap-2"><input type="checkbox" checked={cur.visible} onChange={(e) => update(cur.id, { visible: e.target.checked })} /> إظهار القسم</label><label className="flex items-center gap-2"><input type="checkbox" checked={cur.showDesktop} onChange={(e) => update(cur.id, { showDesktop: e.target.checked })} /> عرض على الكمبيوتر</label><label className="flex items-center gap-2"><input type="checkbox" checked={cur.showMobile} onChange={(e) => update(cur.id, { showMobile: e.target.checked })} /> عرض على الجوال</label></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
const inp = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>{children}</label>; }
