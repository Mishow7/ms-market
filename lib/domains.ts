import "server-only";
import dns from "dns/promises";
import { platformHost } from "./utils";

export type DnsResult = { ok: boolean; checks: { a?: boolean; cname?: boolean; txt?: boolean }; error?: string };

/** Real DNS verification: TXT ownership token + A/CNAME pointing to platform. */
export async function verifyDomainDns(hostname: string, token: string): Promise<DnsResult> {
  const checks: DnsResult["checks"] = {};
  const expectedCname = platformHost().split(":")[0];
  const expectedA = process.env.PLATFORM_IP || "";
  const errors: string[] = [];
  try {
    const txt = await dns.resolveTxt(`_mscommerce.${hostname}`).catch(() => [] as string[][]);
    checks.txt = txt.some((r) => r.join("").includes(token));
    if (!checks.txt) errors.push("سجل TXT للتحقق من الملكية غير موجود");
  } catch {
    checks.txt = false;
  }
  try {
    const cname = await dns.resolveCname(hostname).catch(() => [] as string[]);
    checks.cname = cname.some((c) => c.replace(/\.$/, "") === expectedCname);
  } catch {
    checks.cname = false;
  }
  try {
    const a = await dns.resolve4(hostname).catch(() => [] as string[]);
    checks.a = expectedA ? a.includes(expectedA) : a.length > 0;
  } catch {
    checks.a = false;
  }
  if (!checks.cname && !checks.a) errors.push("سجل A أو CNAME لا يشير إلى المنصة");
  const ok = Boolean(checks.txt && (checks.cname || checks.a));
  return { ok, checks, error: ok ? undefined : errors.join("، ") };
}

export function dnsInstructions(hostname: string, token: string) {
  const base = platformHost().split(":")[0];
  return [
    { type: "TXT", host: `_mscommerce.${hostname}`, value: token, note: "إثبات ملكية الدومين" },
    { type: "CNAME", host: hostname.startsWith("www.") ? "www" : hostname, value: base, note: "توجيه الدومين إلى المنصة" },
    { type: "A", host: "@", value: process.env.PLATFORM_IP || "عنوان IP الخاص بالمنصة", note: "للدومين الجذري (بديل عن CNAME)" },
  ];
}
