"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { checkoutAction, validateCouponAction } from "@/actions/storefront";
import { money, PAYMENT_METHODS } from "@/lib/utils";

type Ship = { id: number; storeId: number; name: string; type: string; price: number; rules: { city?: string; price: string; maxWeight?: number }[]; eta: string | null };
type Pay = { storeId: number; method: string; instructions: string | null };

export function CheckoutForm({ slug, color, user, addresses, shipping, payments }: { slug: string; color: string; user: { name: string; phone: string; email: string } | null; addresses: { id: number; label: string; city: string; text: string; phone: string }[]; shipping: Ship[]; payments: Pay[] }) {
  const { items, clear } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "", city: "", address: "", notes: "" });
  const [per, setPer] = useState<Record<number, { shippingMethodId?: number; paymentMethod: string; couponCode?: string; discount?: number; couponMsg?: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const storeIds = useMemo(() => [...new Set(items.map((i) => i.storeId))], [items]);
  const get = (sid: number) => per[sid] ?? { paymentMethod: payments.find((p) => p.storeId === sid)?.method ?? "", shippingMethodId: shipping.find((s) => s.storeId === sid)?.id };
  const shipCost = (sid: number) => { const s = shipping.find((x) => x.id === get(sid).shippingMethodId); if (!s || s.type === "free" || s.type === "pickup") return 0; if (s.type === "city") { const r = s.rules.find((x) => x.city && form.city.includes(x.city)); return r ? Number(r.price) : s.price; } return s.price; };
  if (items.length === 0) return <p className="mt-8 opacity-60">السلة فارغة.</p>;
  const grand = storeIds.reduce((a, sid) => a + items.filter((i) => i.storeId === sid).reduce((x, i) => x + i.price * i.qty, 0) - (get(sid).discount ?? 0) + shipCost(sid), 0);
  const submit = () => start(async () => {
    setError(null);
    const campaignId = Number(sessionStorage.getItem("ms_campaign") || 0) || undefined;
    const perStore: Record<number, { shippingMethodId?: number; paymentMethod: string; couponCode?: string; campaignId?: number }> = {};
    for (const sid of storeIds) { const g = get(sid); if (!g.paymentMethod) { setError("اختر وسيلة الدفع لكل متجر"); return; } perStore[sid] = { shippingMethodId: g.shippingMethodId, paymentMethod: g.paymentMethod, couponCode: g.couponCode, campaignId }; }
    const r = await checkoutAction({ items, ...form, perStore });
    if (r.error) { setError(r.error); return; }
    clear(); sessionStorage.removeItem("ms_campaign");
    router.push(`/s/${slug}/thanks?g=${r.groupId}`);
  });
  const inp = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none";
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div className="rounded-2xl border border-black/5 bg-white/70 p-5">
          <h2 className="mb-4 font-black">بيانات التوصيل</h2>
          {addresses.length > 0 && <select onChange={(e) => { const a = addresses.find((x) => x.id === Number(e.target.value)); if (a) setForm({ ...form, city: a.city, address: a.text, phone: a.phone || form.phone }); }} className={inp + " mb-3"}><option value="">اختر عنواناً محفوظاً</option>{addresses.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.city} {a.text}</option>)}</select>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inp} placeholder="الاسم الكامل *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inp} placeholder="رقم الهاتف *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={inp} placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={inp} placeholder="المدينة *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} list="cities" />
            <datalist id="cities">{["صنعاء", "عدن", "تعز", "الحديدة", "إب", "المكلا", "ذمار", "سيئون", "مأرب", "حجة"].map((c) => <option key={c} value={c} />)}</datalist>
            <input className={inp + " sm:col-span-2"} placeholder="العنوان التفصيلي (الحي، الشارع، أقرب معلم) *" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <textarea className={inp + " sm:col-span-2"} placeholder="ملاحظات" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        {storeIds.map((sid) => {
          const its = items.filter((i) => i.storeId === sid);
          const g = get(sid);
          const sub = its.reduce((a, i) => a + i.price * i.qty, 0);
          const ships = shipping.filter((s) => s.storeId === sid);
          const pays = payments.filter((p) => p.storeId === sid);
          return (
            <div key={sid} className="rounded-2xl border border-black/5 bg-white/70 p-5">
              <h2 className="font-black">🏬 {its[0].storeName} <span className="text-xs font-normal opacity-60">— طلب مستقل</span></h2>
              <ul className="mt-2 text-sm opacity-80">{its.map((i) => <li key={i.productId + (i.variant ?? "")}>{i.name} {i.variant && `(${i.variant})`} × {i.qty} = {money(i.price * i.qty, i.currency)}</li>)}</ul>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><p className="mb-1 text-sm font-bold">طريقة الشحن</p>{ships.length === 0 ? <p className="text-xs text-rose-600">لم يحدد المتجر طرق شحن (سيتم التواصل معك)</p> : ships.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="radio" name={`ship${sid}`} checked={g.shippingMethodId === s.id} onChange={() => setPer({ ...per, [sid]: { ...g, shippingMethodId: s.id } })} />{s.name} {s.eta && <span className="opacity-60">({s.eta})</span>}</label>)}</div>
                <div><p className="mb-1 text-sm font-bold">طريقة الدفع</p>{pays.length === 0 ? <p className="text-xs text-rose-600">لا توجد وسائل دفع مفعلة لهذا المتجر</p> : pays.map((p) => <label key={p.method} className="flex items-center gap-2 text-sm"><input type="radio" name={`pay${sid}`} checked={g.paymentMethod === p.method} onChange={() => setPer({ ...per, [sid]: { ...g, paymentMethod: p.method } })} />{PAYMENT_METHODS[p.method]}</label>)}{pays.find((p) => p.method === g.paymentMethod)?.instructions && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{pays.find((p) => p.method === g.paymentMethod)?.instructions}</p>}</div>
              </div>
              <div className="mt-4 flex gap-2"><input placeholder="كود الخصم" className={inp + " max-w-[200px]"} value={g.couponCode ?? ""} onChange={(e) => setPer({ ...per, [sid]: { ...g, couponCode: e.target.value.toUpperCase(), discount: 0, couponMsg: undefined } })} /><button type="button" className="rounded-xl border px-4 text-sm font-bold" onClick={async () => { if (!g.couponCode) return; const r = await validateCouponAction(sid, g.couponCode, sub, its.map((i) => i.productId)); setPer({ ...per, [sid]: { ...g, discount: "discount" in r ? r.discount : 0, couponMsg: "error" in r ? r.error : `تم تطبيق خصم ${money(r.discount!, its[0].currency)}` } }); }}>تطبيق</button></div>
              {g.couponMsg && <p className={`mt-1 text-xs ${g.discount ? "text-emerald-600" : "text-rose-600"}`}>{g.couponMsg}</p>}
              <div className="mt-3 border-t border-black/5 pt-3 text-sm"><p className="flex justify-between"><span>المجموع</span><span>{money(sub, its[0].currency)}</span></p>{!!g.discount && <p className="flex justify-between text-emerald-600"><span>الخصم</span><span>- {money(g.discount, its[0].currency)}</span></p>}<p className="flex justify-between"><span>الشحن</span><span>{money(shipCost(sid), its[0].currency)}</span></p><p className="flex justify-between font-black"><span>إجمالي هذا المتجر</span><span>{money(sub - (g.discount ?? 0) + shipCost(sid), its[0].currency)}</span></p></div>
            </div>
          );
        })}
      </div>
      <div className="h-fit rounded-2xl border border-black/5 bg-white/70 p-5 lg:col-span-2">
        <h2 className="font-black">ملخص الطلب</h2>
        <p className="mt-3 flex justify-between text-xl font-black"><span>الإجمالي الكلي</span><span>{money(grand, items[0].currency)}</span></p>
        {storeIds.length > 1 && <p className="mt-1 text-xs opacity-60">سيتم إنشاء {storeIds.length} طلبات مستقلة</p>}
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={pending} onClick={submit} className="mt-4 w-full rounded-xl py-3 font-bold text-white shadow-lg disabled:opacity-50" style={{ background: color }}>{pending ? "جارٍ إنشاء الطلب..." : "تأكيد الطلب"}</button>
        <p className="mt-3 text-xs opacity-60">عند اختيار التحويل البنكي أو المحفظة، ستحصل على بيانات حساب التاجر بعد تأكيد الطلب لإتمام التحويل ورفع الإيصال. لا يُعتمد الطلب كمدفوع إلا بعد تحقق التاجر من وصول المبلغ.</p>
      </div>
    </div>
  );
}
