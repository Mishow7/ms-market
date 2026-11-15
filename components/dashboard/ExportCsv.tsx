"use client";
import { Button } from "@/components/ui";
export function ExportCsvButton({ rows, filename }: { rows: string[][]; filename: string }) {
  return (
    <Button variant="outline" onClick={() => {
      const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = filename; a.click();
    }}>⬇ تصدير CSV</Button>
  );
}
