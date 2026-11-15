import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const dash = user?.role === "super_admin" ? "/admin" : user?.role === "merchant" || user?.role === "staff" ? "/dashboard" : "/account";
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/home" className="flex items-center gap-2 text-xl font-black text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 text-sm text-white">MS</span>
            MS Commerce
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/stores" className="hover:text-teal-700">المتاجر</Link>
            <Link href="/pricing" className="hover:text-teal-700">الباقات</Link>
            <Link href="/about" className="hover:text-teal-700">من نحن</Link>
            <Link href="/faq" className="hover:text-teal-700">الأسئلة الشائعة</Link>
            <Link href="/contact" className="hover:text-teal-700">تواصل معنا</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/api/lang?set=en" className="hidden rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-700 sm:block" title="Switch to English">EN</a>
            <a href="/api/lang?set=ar" className="hidden rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-700 sm:block">ع</a>
            {user ? (
              <>
                <Link href={dash} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">لوحة التحكم</Link>
                <form action={logoutAction}><button className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">خروج</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">دخول</Link>
                <Link href="/register" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">أنشئ متجرك</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <p className="text-lg font-black">MS Commerce</p>
            <p className="mt-2 text-sm text-slate-500">منصة التجارة الإلكترونية متعددة المتاجر للسوق اليمني. أنشئ متجرك بدومين خاص وطرق دفع محلية خلال دقائق.</p>
          </div>
          <div>
            <p className="font-bold">المنصة</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/stores">استكشف المتاجر</Link></li>
              <li><Link href="/pricing">الباقات والأسعار</Link></li>
              <li><Link href="/register">إنشاء متجر</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold">الدعم</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/faq">الأسئلة الشائعة</Link></li>
              <li><Link href="/contact">تواصل معنا</Link></li>
              <li><Link href="/about">من نحن</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold">قانوني</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/privacy">سياسة الخصوصية</Link></li>
              <li><Link href="/terms">الشروط والأحكام</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} MS Commerce. جميع الحقوق محفوظة.</div>
      </footer>
    </div>
  );
}
