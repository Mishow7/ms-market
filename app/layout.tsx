import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MS Commerce",
  description: "منصة تجارة إلكترونية متعددة المتاجر",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = (await cookies()).get("ms_lang")?.value === "en" ? "en" : "ar";
  return (
    <html lang={lang} dir={lang === "en" ? "ltr" : "rtl"}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
