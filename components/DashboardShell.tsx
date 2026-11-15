import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/actions/auth";

export type NavItem = { href: string; label: string; icon: string };

export function DashboardShell({ children, nav, title, subtitle, userName, unread = 0, notificationsHref, extra }: { children: ReactNode; nav: NavItem[]; title: string; subtitle?: string; userName: string; unread?: number; notificationsHref?: string; extra?: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <input type="checkbox" id="nav-toggle" className="peer hidden" />
      <aside className="fixed inset-y-0 start-0 z-40 w-64 -translate-x-full overflow-y-auto border-e border-slate-200 bg-slate-950 text-slate-200 transition-transform peer-checked:translate-x-0 rtl:translate-x-full rtl:peer-checked:translate-x-0 lg:translate-x-0 rtl:lg:translate-x-0 scrollbar-thin">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 text-sm font-black text-white">MS</span>
          <div><p className="text-sm font-black text-white">{title}</p>{subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}</div>
        </div>
        {extra && <div className="border-b border-white/10 p-3">{extra}</div>}
        <nav className="space-y-0.5 p-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
              <span className="text-base">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <label htmlFor="nav-toggle" className="fixed inset-0 z-30 hidden bg-black/40 peer-checked:block lg:peer-checked:hidden" />
      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <label htmlFor="nav-toggle" className="cursor-pointer rounded-lg p-2 hover:bg-slate-100 lg:hidden">☰</label>
            <Link href="/home" className="text-sm text-slate-500 hover:text-teal-700">← الموقع الرئيسي</Link>
          </div>
          <div className="flex items-center gap-2">
            {notificationsHref && (
              <Link href={notificationsHref} className="relative rounded-lg p-2 hover:bg-slate-100">🔔{unread > 0 && <span className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}</Link>
            )}
            <span className="hidden text-sm font-semibold text-slate-700 sm:block">{userName}</span>
            <form action={logoutAction}><button className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">خروج</button></form>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
