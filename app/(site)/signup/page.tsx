import { CustomerSignupForm } from "@/components/site/AuthForms";
import Link from "next/link";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-black">إنشاء حساب عميل</h1>
        <p className="mt-1 text-sm text-slate-500">تسوق من جميع المتاجر بحساب واحد وتابع طلباتك.</p>
        <div className="mt-6"><CustomerSignupForm next={sp.next} /></div>
        <p className="mt-6 text-center text-sm text-slate-500">لديك حساب؟ <Link href="/login" className="font-bold text-teal-700">سجّل الدخول</Link></p>
      </div>
    </div>
  );
}
