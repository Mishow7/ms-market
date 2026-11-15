"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
export function CartBadge({ slug, color }: { slug: string; color: string }) {
  const { count } = useCart();
  return <Link href={`/s/${slug}/cart`} className="relative rounded-xl p-2 hover:bg-black/5">🛒{count > 0 && <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: color }}>{count}</span>}</Link>;
}
