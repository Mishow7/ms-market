import { db } from "@/db";
import { domains, stores } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminDomainAction } from "@/actions/admin";
import { ConfirmButton } from "@/components/ui/client";
import { Badge, PageHeader, Table } from "@/components/ui";
import { DOMAIN_STATUSES, fmtDateTime } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Domains() {
  const rows = await db.select({ d: domains, store: stores.name, storeId: stores.id }).from(domains).innerJoin(stores, eq(stores.id, domains.storeId)).orderBy(desc(domains.id));
  return (
    <div>
      <PageHeader title="الدومينات وSSL" description="إدارة جميع دومينات المتاجر، التحقق من DNS، التفعيل وإصدار SSL. لا يُفعّل الدومين قبل التحقق من الملكية." />
      <Table headers={["الدومين", "المتجر", "النوع", "DNS", "SSL", "الحالة", "آخر فحص", ""]}>
        {rows.map(({ d, store, storeId }) => (
          <tr key={d.id}>
            <td className="px-4 py-3 font-mono text-sm">{d.hostname} {d.isPrimary && <Badge className="bg-amber-100 text-amber-700">أساسي</Badge>}{d.lastError && <p className="text-xs text-rose-600">{d.lastError}</p>}</td>
            <td className="px-4 py-3"><Link href={`/admin/stores/${storeId}`} className="hover:text-teal-700">{store}</Link></td>
            <td className="px-4 py-3">{d.type === "custom" ? "خاص" : "فرعي"}</td>
            <td className="px-4 py-3 text-xs">{d.type === "custom" ? <>TXT {d.dnsChecks.txt ? "✅" : "❌"} • CNAME {d.dnsChecks.cname ? "✅" : "❌"} • A {d.dnsChecks.a ? "✅" : "❌"}</> : "—"}</td>
            <td className="px-4 py-3"><Badge className={d.sslStatus === "issued" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}>{d.sslStatus === "issued" ? "HTTPS مفعل" : d.sslStatus === "pending" ? "قيد الإصدار" : d.sslStatus === "failed" ? "فشل" : "لا يوجد"}</Badge></td>
            <td className="px-4 py-3"><Badge className={DOMAIN_STATUSES[d.status].color}>{DOMAIN_STATUSES[d.status].label}</Badge></td>
            <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(d.lastCheckedAt)}</td>
            <td className="px-4 py-3">{d.type === "custom" && <div className="flex flex-wrap gap-1">
              <ConfirmButton variant="outline" message="تشغيل فحص DNS الآن؟" onConfirm={async () => { "use server"; await adminDomainAction(d.id, "verify"); }}>فحص DNS</ConfirmButton>
              {d.status === "verified" && <ConfirmButton variant="primary" message="تفعيل الدومين وإصدار SSL؟" onConfirm={async () => { "use server"; await adminDomainAction(d.id, "activate"); }}>تفعيل + SSL</ConfirmButton>}
              {d.status === "active" && <ConfirmButton message="إيقاف الدومين؟" onConfirm={async () => { "use server"; await adminDomainAction(d.id, "fail"); }}>إيقاف</ConfirmButton>}
              <ConfirmButton onConfirm={async () => { "use server"; await adminDomainAction(d.id, "delete"); }}>حذف</ConfirmButton>
            </div>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
