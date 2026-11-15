"use client";
import { Button } from "@/components/ui";
export function PrintButton({ label = "🖨 طباعة الفاتورة" }: { label?: string }) {
  return <Button variant="secondary" onClick={() => window.print()}>{label}</Button>;
}
