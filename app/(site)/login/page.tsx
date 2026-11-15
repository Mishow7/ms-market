import { LoginForm } from "@/components/site/AuthForms";
import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; as?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-black">تسجيل الدخول</h1>
        <p className="mt-1 text-sm text-slate-500">{sp.as === "merchant" ? "دخول التجار والموظفين" : "للتجار والعملاء ومالك المنصة"}</p>
        {sp.error === "forbidden" && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">ليس لديك صلاحية الوصول لهذه الصفحة.</p>}
        {sp.error === "no_store" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">لا يوجد متجر مرتبط بحسابك. <Link href="/register" className="underline">أنشئ متجراً</Link></p>}
        <div className="mt-6"><LoginForm next={sp.next} /></div>
        <p className="mt-6 text-center text-sm text-slate-500">ليس لديك حساب؟ <Link href="/signup" className="font-bold text-teal-700">حساب عميل</Link> أو <Link href="/register" className="font-bold text-teal-700">إنشاء متجر</Link></p>
      </div>
    </div>
  );
}
