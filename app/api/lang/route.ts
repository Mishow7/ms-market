import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("set") === "en" ? "en" : "ar";
  const back = req.headers.get("referer") || "/home";
  const res = NextResponse.redirect(back);
  res.cookies.set("ms_lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
