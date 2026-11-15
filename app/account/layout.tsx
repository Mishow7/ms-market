import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [{ c }] = await db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
  const nav = [["/account", "📦 طلباتي"], ["/account/addresses", "📍 عناويني"], ["/account/wishlist", "❤️ المفضلة"], ["/account/notifications", `🔔 الإشعارات${c ? ` (${c})` : ""}`], ["/account/profile", "👤 حسابي"]];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><Link href="/home" className="font-black">MS Commerce</Link><div className="flex items-center gap-3 text-sm"><span>{user.name}</span>{(user.role === "merchant" || user.role === "super_admin") && <Link href={user.role === "super_admin" ? "/admin" : "/dashboard"} className="rounded-lg bg-slate-900 px-3 py-1.5 text-white">لوحة التحكم</Link>}<form action={logoutAction}><button className="text-slate-500">خروج</button></form></div></div></header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-4">
        <aside className="h-fit rounded-2xl border bg-white p-3 md:col-span-1"><nav className="space-y-1">{nav.map(([h, l]) => <Link key={h} href={h} className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100">{l}</Link>)}</nav></aside>
        <main className="md:col-span-3">{children}</main>
      </div>
    </div>
  );
}
