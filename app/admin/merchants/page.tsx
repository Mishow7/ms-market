import { db } from "@/db";
import { stores, users } from "@/db/schema";
import { count, desc, eq, ilike, ne, or, and } from "drizzle-orm";
import { Badge, Button, PageHeader, Table } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { adminToggleUserAction } from "@/actions/admin";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
const ROLE: Record<string, string> = { super_admin: "مالك المنصة", merchant: "تاجر", staff: "موظف", customer: "عميل" };

export default async function Merchants({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { q, role } = await searchParams;
  const conds = [ne(users.role, "x")];
  if (q) conds.push(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))!);
  if (role) conds.push(eq(users.role, role));
  const rows = await db.select({ u: users, sc: count(stores.id) }).from(users).leftJoin(stores, eq(stores.ownerId, users.id)).where(and(...conds)).groupBy(users.id).orderBy(desc(users.createdAt)).limit(200);
  return (
    <div>
      <PageHeader title="التجار والمستخدمون" description="إدارة حسابات التجار والموظفين والعملاء" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="بحث بالاسم أو البريد" className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm" />
        <select name="role" defaultValue={role} className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm"><option value="">كل الأدوار</option>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <Button type="submit" variant="outline">بحث</Button>
      </form>
      <Table headers={["المستخدم", "الدور", "المتاجر المملوكة", "الحالة", "تاريخ التسجيل", ""]}>
        {rows.map(({ u, sc }) => (
          <tr key={u.id}>
            <td className="px-4 py-3"><p className="font-bold">{u.name}</p><p className="text-xs text-slate-400">{u.email} {u.phone && `• ${u.phone}`}</p></td>
            <td className="px-4 py-3"><Badge>{ROLE[u.role]}</Badge></td>
            <td className="px-4 py-3">{sc}</td>
            <td className="px-4 py-3"><Badge className={u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{u.isActive ? "نشط" : "معطل"}</Badge></td>
            <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
            <td className="px-4 py-3">{u.role !== "super_admin" && <ConfirmButton variant={u.isActive ? "danger" : "primary"} message={u.isActive ? "تعطيل هذا الحساب؟" : "تفعيل الحساب؟"} onConfirm={async () => { "use server"; await adminToggleUserAction(u.id, !u.isActive); }}>{u.isActive ? "تعطيل" : "تفعيل"}</ConfirmButton>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
